import { PromiseDelegate } from '@lumino/coreutils';
import { Aliases } from './aliases';
import { ansi } from './ansi';
import type { IWorkerIO } from './buffered_io';
import type { ISize } from './callback';
import type { IExternalCommandResult } from './callback_internal';
import type { ICommandLine } from './command_line';
import { CommandModule, CommandModuleLoader, CommandPackage, CommandRegistry } from './commands';
import type { IRunContext } from './context';
import type { IShellImpl } from './defs_internal';
import { Environment } from './environment';
import {
  ErrorExitCode,
  FindCommandError,
  GeneralError,
  unsupportedRedirect
} from './error_exit_code';
import { ExitCode } from './exit_code';
import { expandString, expandToken, expandTokens, nameRegex } from './expand';
import type { IFileSystem } from './file_system';
import { History } from './history';
import type { IInput, IOutput } from './io';
import {
  DummyInput,
  DummyOutput,
  FileInput,
  FileOutput,
  Pipe,
  StringInput,
  TerminalInput,
  TerminalOutput
} from './io';
import { CommandNode, isCommandComplete, parse, PipeNode } from './parse';
import { SharedFS } from './shared_fs';
import { TabCompleter } from './tab_completer';
import type { Termios } from './termios';
import type { Token } from './tokenize';
import { splitRedirect } from './tokenize';
import { joinURL, stringFromCharCodes } from './utils';

/** `NAME=value` assignment token: a leading name whose equals sign is outside any single-quoted section.
 * @param token The token to parse for a `NAME=value` assignment.
 * @returns A tuple containing the name and value if the token is a valid `NAME=value` assignment, or undefined otherwise.
 */
function _parseAssignment(token: Token): [string, string] | undefined {
  const index: number = token.value.indexOf('=');
  const isSingleQuotedAtIndex: boolean =
    token.singleQuoted?.some(([start, end]) => index >= start && index < end) ?? false;
  if (index <= 0 || isSingleQuotedAtIndex) {
    // '=1' (empty name), '1X=2' and "'X'=1" (equals inside single quotes) are not assignments;
    // bash reports command not found for all three because the name regex rejects them.
    // TODO: Consider handling more edge cases for assignment parsing.
    // TODO: Should we return an error or some indication that the assignment is invalid
    return undefined;
  }
  const name: string = token.value.slice(0, index);
  if (!nameRegex.test(name)) {
    return undefined;
  }
  return [name, token.value.slice(index + 1)];
}

/**
 * Shell implementation.
 */
export class ShellImpl implements IShellImpl {
  constructor(options: IShellImpl.IOptions) {
    this._options = options;
    this._commandModuleLoader = new CommandModuleLoader(
      options.wasmBaseUrl,
      this._wasmUrlQueryParams.bind(this),
      options.downloadModuleCallback
    );

    // Correct values for FS, etc, are filled in by initFileSystem.
    this._fileSystem = {
      FS: undefined,
      PATH: undefined,
      ERRNO_CODES: undefined,
      PROXYFS: undefined,
      mountpoint: options.mountpoint ?? '/drive'
    };

    const { shellId, stdinContext, termios, workerIO, workerType } = options;

    // Content within which commands are run.
    this._runContext = {
      commandId: -1,
      name: '',
      args: [],
      fileSystem: this._fileSystem,
      aliases: new Aliases(),
      commandRegistry: new CommandRegistry(
        options.commandStateChangedCallback,
        this.callExternalCommand.bind(this),
        options.callExternalTabComplete
      ),
      environment: new Environment(options.color, options.shellId, options.browsingContextId),
      history: new History(),
      shellId,
      terminate: this.terminate.bind(this),
      stdin: this._dummyInput,
      stdout: this._dummyOutput,
      stderr: this._dummyOutput,
      size: () => this.size,
      termios,
      workerIO,
      workerType,
      commandModuleCache: this._commandModuleLoader.cache,
      stdinContext
    };

    // External commands.
    options.externalCommandConfigs.forEach(config =>
      this._runContext.commandRegistry.registerExternalCommand(config.name, config.hasTabComplete)
    );

    this._stderr = new TerminalOutput(
      this.output.bind(this),
      this._options.color ? ansi.styleRed : undefined,
      this._options.color ? ansi.styleReset : undefined
    );

    this._tabCompleter = new TabCompleter(
      this._runContext,
      this._options.enableBufferedStdinCallback,
      this._options.termios
    );
  }

  get aliases(): Aliases {
    return this._runContext.aliases;
  }

  async callExternalCommand(
    name: string,
    args: string[],
    environment: { [key: string]: string },
    stdinIsTerminal: boolean,
    stdoutIsTerminal: boolean,
    stderrIsTerminal: boolean,
    termiosFlags: Termios.IFlags
  ): Promise<{
    exitCode: number;
    environmentChanges?: { [key: string]: string | undefined };
  }> {
    // Separates the start of the external command and its end which is handled by a promise
    // delegate. This is so that we are not awaiting the end of the command across the web worker to
    // main UI thread interface whilst we are potentially also awaiting stdin across that interface.
    this._options.callExternalCommand(
      name,
      args,
      environment,
      stdinIsTerminal,
      stdoutIsTerminal,
      stderrIsTerminal,
      termiosFlags
    );

    const promise = new PromiseDelegate<IExternalCommandResult>();
    if (this._externalCommandPromise !== undefined) {
      this._externalCommandPromise.reject('Previous external command did not exit properly');
    }
    this._externalCommandPromise = promise;

    return await promise.promise;
  }

  get environment(): Environment {
    return this._runContext.environment;
  }

  exitCode(): number {
    return this._exitCode;
  }

  exitExternalCommand(result: IExternalCommandResult): void {
    // Called when an external command finishes.
    if (this._externalCommandPromise !== undefined) {
      this._externalCommandPromise.resolve(result);
      this._externalCommandPromise = undefined;
    }
  }

  async externalInput(maxChars: number | null): Promise<string> {
    const chars = await this._runContext.stdin.readAsync(maxChars);
    return stringFromCharCodes(chars);
  }

  externalOutput(text: string, isStderr: boolean): void {
    // Pass output from an external command to the current IOutput.
    const output: IOutput = isStderr ? this._runContext.stderr : this._runContext.stdout;
    output.write(text);
  }

  get history(): History {
    return this._runContext.history;
  }

  async initialize() {
    await this._initWasmPackages();

    // Aliases and env vars from constructor options override those from cockle-config.json
    Object.entries(this._options.aliases).forEach(([name, value]) =>
      this._runContext.aliases.set(name, value)
    );

    Object.entries(this._options.environment).forEach(([name, value]) => {
      if (value === undefined) {
        this._runContext.environment.delete(name);
      } else {
        this._runContext.environment.set(name, value);
      }
    });

    await this._initFileSystem();
  }

  async input(chars: string): Promise<void> {
    // Input can be from the keyboard or a paste operation.
    // Input from the keyboard is for a single keystroke which may be a single character or
    // multiple characters if it is an escape code (e.g. left arrow).
    // Input from a paste operation will be a single, potentially very large, string.
    if (!this._isRunning) {
      return;
    }

    const n = chars.length;
    for (let index = 0; index < n; ++index) {
      const char = chars[index];
      const code = char.charCodeAt(0);
      switch (code) {
        case 10:
        case 13: {
          // \r or \n: run the command line, or continue it on the next line if incomplete.
          this.output('\n');
          const cmdText = this._commandLine.text;
          this._commandLine.text = '';
          this._commandLine.cursorIndex = 0;
          let promptIndex = 1;
          if (cmdText.length > 0) {
            if (isCommandComplete(cmdText, this.aliases)) {
              await this._runCommands(cmdText);
            } else {
              // Keep the text and wait for the next line.
              this._commandLine.text = `${cmdText}\n`;
              this._commandLine.cursorIndex = this._commandLine.text.length;
              promptIndex = 2;
            }
          }
          await this._outputPrompt(promptIndex);
          break;
        }
        case 127: // Backspace
          if (this._commandLine.cursorIndex > 0) {
            const { cursorIndex, text } = this._commandLine;
            const suffix = text.slice(cursorIndex);
            this._commandLine.text = text.slice(0, cursorIndex - 1) + suffix;
            this._commandLine.cursorIndex--;
            this.output(
              ansi.cursorLeft(1) + suffix + ansi.eraseEndLine + ansi.cursorLeft(suffix.length)
            );
          }
          break;
        case 9: // Tab \t
          this._commandLine = await this._tabCompleter.complete(this._commandLine);
          break;
        case 27: // Escape following by 1+ more characters
          index += this._escapedInput(chars, index);
          break;
        case 3: // Ctrl-C: discard the current command line and show a new prompt.
          this.output('^C');
          this._commandLine.text = '';
          this._commandLine.cursorIndex = 0;
          await this._outputPrompt();
          break;
        case 4: // EOT, usually = Ctrl-D: exit the shell if the command line is empty.
          if (this._commandLine.text.length === 0) {
            this.output('exit\n');
            this.terminate();
            return;
          }
          break;
        case 12: {
          // FF, usually = Ctrl-L. Clear screen, then redraw prompt and command line.
          const { cursorIndex, text } = this._commandLine;
          this.output(ansi.eraseScreen + ansi.eraseSavedLines + ansi.cursorHome);
          await this._outputPrompt();
          this.output(text + ansi.cursorLeft(text.length - cursorIndex));
          break;
        }
        default:
          // Add char to command line at cursor position.
          if (this._commandLine.cursorIndex === this._commandLine.text.length) {
            // Append char.
            this._commandLine.text += char;
            this.output(char);
          } else {
            // Insert char.
            const { cursorIndex, text } = this._commandLine;
            const suffix = text.slice(cursorIndex);
            this._commandLine.text = text.slice(0, cursorIndex) + char + suffix;
            this.output(ansi.eraseEndLine + char + suffix + ansi.cursorLeft(suffix.length));
          }
          this._commandLine.cursorIndex++;
          break;
      }
    }
  }

  output(text: string): void {
    if (!this._isRunning) {
      return;
    }
    this._runContext.workerIO.write(text);
  }

  setSize(size: ISize): void {
    this._size = size;
    this.environment.setSize(size);
  }

  setWorkerIO(workerIO: IWorkerIO) {
    this._runContext.workerIO = workerIO;
  }

  get size(): ISize {
    return this._size;
  }

  async start(): Promise<void> {
    this._isRunning = true;
    await this._outputPrompt();
  }

  terminate() {
    console.log('Cockle ShellImpl.terminate');
    this._isRunning = false;
    this._options.terminateCallback();
  }

  async themeChange(isDark?: boolean): Promise<void> {
    this._requestedDarkMode = isDark;

    if (this._themeStatus !== ThemeStatus.Ok) {
      // Already pending or changing, don't need to repeat.
      return;
    }

    this._themeStatus = ThemeStatus.PendingChange;

    if (!this._runContext.workerIO.enabled) {
      await this._handleThemeChange();
    }
  }

  /**
   * Handle input where the first character is an escape (ascii 27).
   * @param chars Input string.
   * @param index Index of the ESCAPE character in input string.
   * @returns Number of characters consumed.
   */
  private _escapedInput(chars: string, index: number): number {
    if (chars.at(index + 1) !== '[') {
      return 0;
    }

    // Escape token excluding initial ESC and [
    const regex = /^[^A-Z~]*[A-Z~]/;
    const match = regex.exec(chars.slice(index + 2));
    if (match === null) {
      return 1; // Skip the [
    }

    const token = match[0];
    switch (token) {
      case 'A': // Up arrow
      case '1A':
      case 'B': // Down arrow
      case '1B': {
        const cmdText = this.history.scrollCurrent(token.endsWith('B'));
        this._commandLine.text = cmdText !== null ? cmdText : '';
        this._commandLine.cursorIndex = this._commandLine.text.length;
        // Re-output whole line.
        this.output(
          ansi.eraseEndLine +
            ansi.eraseStartLine +
            `\r${expandString(this.environment.getPrompt(1), this.environment)}${this._commandLine.text}`
        );
        break;
      }
      case 'D': // Left arrow
      case '1D':
        if (this._commandLine.cursorIndex > 0) {
          this._commandLine.cursorIndex--;
          this.output(ansi.cursorLeft());
        }
        break;
      case 'C': // Right arrow
      case '1C':
        if (this._commandLine.cursorIndex < this._commandLine.text.length) {
          this._commandLine.cursorIndex++;
          this.output(ansi.cursorRight());
        }
        break;
      case '3~': // Delete
        if (this._commandLine.cursorIndex < this._commandLine.text.length) {
          const { cursorIndex, text } = this._commandLine;
          const suffix = text.slice(cursorIndex + 1);
          this._commandLine.text = text.slice(0, cursorIndex) + suffix;
          this.output(ansi.eraseEndLine + suffix + ansi.cursorLeft(suffix.length));
        }
        break;
      case 'H': // Home
      case '1;2H':
        if (this._commandLine.cursorIndex > 0) {
          this.output(ansi.cursorLeft(this._commandLine.cursorIndex));
          this._commandLine.cursorIndex = 0;
        }
        break;
      case 'F': // End
      case '1;2F': {
        const { length } = this._commandLine.text;
        if (this._commandLine.cursorIndex < length) {
          this.output(ansi.cursorRight(length - this._commandLine.cursorIndex));
          this._commandLine.cursorIndex = length;
        }
        break;
      }
      case '1;2D': // Start of previous word
      case '1;5D':
        if (this._commandLine.cursorIndex > 0) {
          const { cursorIndex, text } = this._commandLine;
          const index = text.slice(0, cursorIndex).trimEnd().lastIndexOf(' ') + 1;
          this.output(ansi.cursorLeft(cursorIndex - index));
          this._commandLine.cursorIndex = index;
        }
        break;
      case '1;2C': // End of next word
      case '1;5C': {
        const { length } = this._commandLine.text;
        if (this._commandLine.cursorIndex < length - 1) {
          const { cursorIndex, text } = this._commandLine;
          const end = text.slice(cursorIndex);
          const trimmed = end.trimStart();
          const i = trimmed.indexOf(' ');
          const index = i < 0 ? length : cursorIndex + end.length - trimmed.length + i;
          this.output(ansi.cursorRight(index - cursorIndex));
          this._commandLine.cursorIndex = index;
        }
        break;
      }
      default:
        // Unrecognised control sequence, ignore.
        console.warn(`Unrecognised escape sequence '[${token}'`);
        break;
    }

    return token.length + 1;
  }

  private _filenameExpansion(args: string[]): string[] {
    const { PATH } = this._runContext.fileSystem;
    const ret: string[] = [];

    // ToDo:
    // - Handling of absolute paths
    // - Handling of . and .. and hidden files
    // - Wildcards in quoted strings should be ignored
    // - [ab] syntax
    // - Multiple wildcards in different directory levels in the same arg
    for (const arg of args) {
      // May not always be appropriate to do filename wildcard expansion, it depends if we have
      // information the possible command arguments.
      if (arg.startsWith('-')) {
        ret.push(arg);
        continue;
      } else if (!(arg.includes('*') || arg.includes('?'))) {
        ret.push(arg);
        continue;
      }

      const { FS } = this._runContext.fileSystem!;
      const analyze = FS.analyzePath(arg, false);
      if (!analyze.parentExists) {
        ret.push(arg);
        continue;
      }
      const parentPath = analyze.parentPath;

      // Assume relative path.
      let relativePath = parentPath;
      const pwd = FS.cwd();
      if (relativePath.startsWith(pwd)) {
        relativePath = relativePath.slice(pwd.length);
        if (relativePath.startsWith('/')) {
          relativePath = relativePath.slice(1);
        }
      }

      let possibles = FS.readdir(parentPath);

      // Transform match string to a regex.
      // Escape special characters, * and ? dealt with separately.
      let match = analyze.name.replace(/[.+^${}()|[\]\\]/g, '\\$&');
      match = match.replaceAll('*', '.*');
      match = match.replaceAll('?', '.');
      const regex = new RegExp(`^${match}$`);
      possibles = possibles.filter((path: string) => path.match(regex));

      // Remove all . files/directories; need to fix this.
      possibles = possibles.filter((path: string) => !path.startsWith('.'));

      if (relativePath.length > 0) {
        possibles = possibles.map((path: string) => PATH.join(relativePath, path));
      }

      if (possibles.length > 0) {
        ret.push(...possibles);
      } else {
        ret.push(arg);
      }
    }

    return ret;
  }

  private async _handleThemeChange(): Promise<void> {
    if (this._themeStatus === ThemeStatus.Changing) {
      // Don't run more than once concurrently.
      return;
    }

    if (this._requestedDarkMode !== undefined) {
      // Early return as we already know if dark/light mode.
      this._setDarkMode(this._requestedDarkMode);
      return;
    }

    // Need to determine if dark or light mode.
    this._themeStatus = ThemeStatus.Changing;

    await this._options.enableBufferedStdinCallback(true);
    const { termios, workerIO } = this._options;
    termios.setRawMode();

    // Operating System Command to get terminal background color.
    // https://invisible-island.net/xterm/ctlseqs/ctlseqs.html#h3-Operating-System-Commands
    this.output('\x1b]11;?\x07');

    const timeoutMs = 100;
    const start = performance.now();
    const chars = await workerIO.readAsync(null, timeoutMs);
    console.debug('Cockle theme change', (performance.now() - start).toFixed(1), 'ms');

    termios.setDefaultShell();
    await this._options.enableBufferedStdinCallback(false);

    this._themeStatus = ThemeStatus.Ok;

    const charStr = stringFromCharCodes(chars);
    // Expecting something like this: ]11;rgb:8080/0000/ffff\
    // eslint-disable-next-line no-control-regex
    const re = /^\x1b]11;rgb:([0-9A-Fa-f]{2,})\/([0-9A-Fa-f]{2,})\/([0-9A-Fa-f]{2,})\x1b\\$/;
    const match = re.exec(charStr);
    if (!match) {
      console.warn('Unable to determine terminal background color');
      this._setDarkMode(undefined);
    } else {
      const r = parseInt(match[1].slice(0, 2), 16) / 255.0;
      const g = parseInt(match[2].slice(0, 2), 16) / 255.0;
      const b = parseInt(match[3].slice(0, 2), 16) / 255.0;
      const lum = (r + g + b) / 3.0;
      this._setDarkMode(lum < 0.6);
    }
  }

  private async _initFileSystem(): Promise<void> {
    const { wasmBaseUrl } = this._options;
    const fsModule = await this._commandModuleLoader.getWasmModule('cockle_fs', 'fs');
    if (fsModule === undefined) {
      // Cannot report this in the terminal as it has not been started yet.
      // TODO: Store this information and report it when the terminal is up and running?
      console.error('Unable to load cockle_fs, shell cannot function');
      return;
    }
    const module = await fsModule({
      locateFile: (path: string) => joinURL(wasmBaseUrl, 'cockle_fs/' + path)
    });
    const { FS, PATH, ERRNO_CODES, PROXYFS } = module;

    this._runContext.fileSystem.FS = FS;
    this._runContext.fileSystem.PATH = PATH;
    this._runContext.fileSystem.ERRNO_CODES = ERRNO_CODES;
    this._runContext.fileSystem.PROXYFS = PROXYFS;

    // Create new directories.
    SharedFS.NON_WASM_DIRECTORIES_SHARED.forEach(dir => {
      try {
        FS.mkdir(dir, SharedFS.TOP_LEVEL_DIRECTORY_PERMISSIONS);
      } catch (err: any) {
        console.error(`Failed to create directory ${dir}`);
      }
    });

    const mountpoint = this._fileSystem.mountpoint;
    try {
      FS.mkdirTree(mountpoint, SharedFS.TOP_LEVEL_DIRECTORY_PERMISSIONS);
    } catch (err: any) {
      console.error(`Failed to create mountpoint directory ${mountpoint}`);
    }

    // Set permissions of directories that are created in wasm module.
    SharedFS.ALL_WASM_DIRECTORIES.forEach(dir => {
      try {
        FS.chmod(dir, SharedFS.TOP_LEVEL_DIRECTORY_PERMISSIONS);
      } catch (err: any) {
        console.error(`Failed to chmod ${dir}`);
      }
    });

    // Set permissions of root directory.
    try {
      FS.chmod('/', SharedFS.ROOT_DIRECTORY_PERMISSIONS);
    } catch (err: any) {
      console.error('Failed to chmod of root directory');
    }

    const { browsingContextId, baseUrl, initialDirectories, initialFiles } = this._options;
    await this._options.initDriveFSCallback({
      browsingContextId,
      baseUrl,
      fileSystem: this._runContext.fileSystem,
      mountpoint
    });

    FS.chdir(mountpoint);

    if (initialDirectories) {
      initialDirectories.forEach((directory: string) => FS.mkdir(directory, 0o775));
    }

    if (initialFiles) {
      Object.entries(initialFiles).forEach(([filename, contents]) =>
        FS.writeFile(filename, contents, { mode: 0o664 })
      );
    }

    if (this._options.cwd !== undefined) {
      try {
        FS.chdir(this._options.cwd);
      } catch (err: any) {
        // Remains in mountpoint.
        console.error('Failed to cd to ' + this._options.cwd);
      }
    }

    this.environment.set('PWD', FS.cwd());
  }

  private async _initWasmPackages(): Promise<void> {
    const filename = 'cockle-config.json';
    const queryParams = await this._wasmUrlQueryParams(filename);
    const url = joinURL(this._options.wasmBaseUrl, filename + queryParams);
    const response = await fetch(url);
    if (!response.ok) {
      // Would be nice to report this via the terminal.
      console.error(`Failed to fetch ${url}, terminal cannot function without it`);
    }

    const cockleConfig = await response.json();
    // Check JSON follows schema?
    // May want to store JSON config.

    const packageNames = Object.keys(cockleConfig.packages);
    const fsPackage = 'cockle_fs';
    if (!packageNames.includes(fsPackage)) {
      console.error(`cockle-config.json does not include required package '${fsPackage}'`);
    }

    // Create command runners for each wasm module of each emscripten-forge package.
    for (const packageName of packageNames) {
      const pkgConfig = cockleConfig.packages[packageName]; // Not type safe
      const commandModules = Object.entries(pkgConfig.modules).map(
        ([moduleName, moduleConfig]) =>
          new CommandModule(
            this._commandModuleLoader,
            moduleName,
            (moduleConfig as any).commands ? (moduleConfig as any).commands.split(',') : [],
            packageName,
            pkgConfig.wasm
          )
      );
      const commandPackage = new CommandPackage(
        packageName,
        pkgConfig.version,
        pkgConfig.build_string,
        pkgConfig.channel,
        pkgConfig.platform,
        pkgConfig.wasm,
        commandModules
      );
      this._runContext.commandRegistry.registerCommandPackage(commandPackage);
    }

    // Initialise aliases.
    if (Object.hasOwn(cockleConfig, 'aliases')) {
      for (const [key, v] of Object.entries(cockleConfig.aliases)) {
        const value = v as string;
        if (value.length > 0) {
          this.aliases.set(key, value);
        }
      }
    }

    // Initialise environment variables.
    if (Object.hasOwn(cockleConfig, 'environment')) {
      for (const [key, v] of Object.entries(cockleConfig.environment)) {
        const value = v as string;
        if (value.length > 0) {
          this.environment.set(key, value);
        }
      }
    }
  }

  private _nextCommandId(): number {
    return ++this._commandId;
  }

  private async _outputPrompt(promptIndex: number = 1): Promise<void> {
    if (!this._isRunning) {
      return;
    }
    if (this._themeStatus === ThemeStatus.PendingChange) {
      await this._handleThemeChange();
    }
    // Get prompt just before using as a theme change above can change the PS1 prompt colors.
    const prompt = expandString(this.environment.getPrompt(promptIndex), this.environment);
    this._runContext.workerIO.write(`\n${prompt}`);
  }

  private async _runCommands(cmdText: string): Promise<void> {
    if (cmdText.startsWith('!')) {
      // Get command from history and run that.
      const index = parseInt(cmdText.slice(1));
      const possibleCmd = this.history.at(index);
      if (possibleCmd === null) {
        // Does not set exit code.
        let text = '!' + index + ': event not found';
        if (this._options.color) {
          text = ansi.styleBoldRed + text + ansi.styleReset;
        }
        this.output(`${text}\n`);
        await this._outputPrompt();
        return;
      }
      cmdText = possibleCmd;
    }

    await this._options.enableBufferedStdinCallback(true);
    this._options.termios.setDefaultWasm();

    this.history.add(cmdText);

    let exitCode!: number;
    const stdin = new TerminalInput(
      timeoutMs => this._runContext.workerIO.pollInput(timeoutMs),
      maxChars => this._runContext.workerIO.read(maxChars),
      maxChars => this._runContext.workerIO.readAsync(maxChars, -1) // -1 means infinite wait
    );
    const stdout = new TerminalOutput(this.output.bind(this));
    const stderr = this._stderr;
    try {
      const nodes = parse(cmdText, true, this.aliases);

      for (const node of nodes) {
        if (node instanceof CommandNode) {
          exitCode = await this._runCommand(node, stdin, stdout, stderr);
        } else if (node instanceof PipeNode) {
          const { commands } = node;
          const n = commands.length;
          let prevPipe: Pipe;
          for (let i = 0; i < n; i++) {
            const input = i === 0 ? stdin : prevPipe!.input;
            const output = i < n - 1 ? (prevPipe = new Pipe()) : stdout;
            exitCode = await this._runCommand(commands[i], input, output, stderr);
          }
        } else {
          // This should not occur.
          throw new GeneralError(`Expected CommandNode or PipeNode not ${node}`);
        }
      }
    } catch (error: any) {
      if (error instanceof ErrorExitCode) {
        exitCode = error.exitCode;
      }
      stderr.write(error + '\n');
      stderr.flush();
    } finally {
      exitCode = exitCode ?? ExitCode.GENERAL_ERROR;
      this._setExitCode(exitCode);

      this._options.termios.setDefaultShell();
      await this._options.enableBufferedStdinCallback(false);
    }
  }

  private async _runCommand(
    commandNode: CommandNode,
    input: IInput,
    output: IOutput,
    error: IOutput
  ): Promise<number> {
    const head = commandNode.name;
    if (
      head !== undefined &&
      _parseAssignment(head) !== undefined &&
      commandNode.suffix.every(_parseAssignment)
    ) {
      for (const token of [head, ...commandNode.suffix]) {
        const name = _parseAssignment(token)?.[0];
        if (name === undefined) {
          continue;
        }
        this.environment.set(name, expandToken(token, this.environment).slice(name.length + 1));
      }
      return ExitCode.SUCCESS;
    }
    // Anything else, such as `A=1 echo hi`, is treated as a command, which is not found.
    const name = head?.value ?? '';
    const runner = this._runContext.commandRegistry.get(name);
    if (name !== '' && runner === null) {
      // Give location of command in input?
      throw new FindCommandError(name);
    }

    ({ input, output, error } = this._applyRedirects(commandNode, input, output, error));

    let commandId = -1;
    let exitCode: number = ExitCode.SUCCESS;
    try {
      if (runner !== null) {
        // Set current properties of IContext.
        let args: string[] = expandTokens(commandNode.suffix, this.environment);
        args = this._filenameExpansion(args);
        commandId = this._nextCommandId();
        this._runContext.commandId = commandId;
        this._runContext.name = name;
        this._runContext.args = [...args];
        this._runContext.stdin = input;
        this._runContext.stdout = output;
        this._runContext.stderr = error;

        this._options.commandStateChangedCallback({
          commandId,
          name,
          args,
          state: 'loading'
        });

        exitCode = await runner.run(this._runContext);
      }
    } finally {
      // stdout and stderr can be the same IOutput, e.g. '> out 2>&1'. Flush only once: a second
      // FileOutput.flush() would write an empty string and truncate the file.
      if (error === output) {
        output.flush();
      } else {
        error.flush();
        output.flush();
      }

      if (runner !== null) {
        // Reset properties of IContext.
        this._runContext.commandId = -1;
        this._runContext.name = '';
        this._runContext.args = [];
        this._runContext.stdin = this._dummyInput;
        this._runContext.stdout = this._dummyOutput;
        this._runContext.stderr = this._dummyOutput;
      }
    }

    if (runner !== null) {
      this._options.commandStateChangedCallback({
        commandId,
        exitCode,
        state: 'finished'
      });
    }
    return exitCode;
  }

  private _applyRedirects(
    commandNode: CommandNode,
    input: IInput,
    output: IOutput,
    error: IOutput
  ): { input: IInput; output: IOutput; error: IOutput } {
    if (commandNode.redirects) {
      const fileSystem = this._runContext.fileSystem;
      for (const redirect of commandNode.redirects) {
        // Redirects take effect left to right, so duplicating a file descriptor copies whichever
        // target it points to at that moment. When several redirects target the same descriptor,
        // the last one wins.
        const token = redirect.token.value;
        const target = redirect.target.value;
        const { fd, operator } = splitRedirect(token);

        switch (operator) {
          case '>':
          case '>|':
          case '>>': {
            const append: boolean = operator === '>>';
            const fileOutput = new FileOutput(fileSystem, target, append);
            if (fd === 1) {
              output = fileOutput;
            } else if (fd === 2) {
              error = fileOutput;
            } else {
              throw unsupportedRedirect(token, fd);
            }
            break;
          }

          case '&>':
          case '&>>': {
            // Both standard output and standard error ('cmd &> file').
            const appendBoth: boolean = operator === '&>>';
            output = error = new FileOutput(fileSystem, target, appendBoth);
            break;
          }

          case '<':
          case '<>': {
            if (fd !== 0) {
              throw unsupportedRedirect(token, fd);
            }
            // '<> file' opens for reading and writing. cockle commands only read from stdin.
            const readWrite: boolean = operator === '<>';
            input = new FileInput(fileSystem, target, readWrite);
            break;
          }

          case '<<':
          case '<<-': {
            const body: string | undefined = redirect.token.heredoc;
            if (body === undefined) {
              // Should not occur as the shell only runs complete commands.
              throw new GeneralError('Here document is incomplete');
            }
            input = new StringInput(body);
            break;
          }

          case '<<<':
            if (fd !== 0) {
              throw unsupportedRedirect(token, fd);
            }
            // Here string: 'cat <<< hello'.
            input = new StringInput(`${target}\n`);
            break;

          case '<&':
            if (fd !== 0) {
              throw unsupportedRedirect(token, fd);
            } else if (target === '-') {
              // Closed standard input, reads return nothing.
              input = this._dummyInput;
            } else if (target !== '0') {
              throw new GeneralError(`Redirect '${token}${target}' is not supported`);
            }
            break;

          case '>&': {
            const match = /^(\d*)(-?)$/.exec(target);

            if (match === null) {
              // A word that is not a file descriptor redirects both streams: 'cmd >& file'.
              output = error = new FileOutput(fileSystem, target, false);
              break;
            }

            // A bare '-' closes this file descriptor: 'cmd 2>&-'.
            const targetFd = match[1] === '' ? fd : parseInt(match[1], 10);
            if (fd === 1 && targetFd === 2) {
              output = error;
            } else if (fd === 2 && targetFd === 1) {
              error = output;
            } else if (fd !== targetFd || (fd !== 1 && fd !== 2)) {
              throw new GeneralError(`Redirect '${token}${target}' is not supported`);
            }

            if (match[2] === '-') {
              // Moving a file descriptor closes the target: '2>&1-'
              if (targetFd === 1) {
                output = this._dummyOutput;
              } else {
                error = this._dummyOutput;
              }
            }
            break;
          }

          default:
            throw new GeneralError(`Unrecognised redirect ${token}`);
        }
      }
    }

    return { input, output, error };
  }

  private _setDarkMode(darkMode: boolean | undefined): void {
    if (darkMode === this._darkMode) {
      return;
    }

    this._darkMode = darkMode;

    // Set prompt color.
    if (this._options.color) {
      this._stderr.prefix = darkMode ? ansi.styleBrightRed : ansi.styleRed;

      const promptColor = darkMode ? ansi.styleBoldGreen : ansi.styleGreen;
      this._runContext.environment.set('PS1', promptColor + 'js-shell:' + ansi.styleReset + ' ');
    }

    // Set/delete environment variable.
    const envVarName = 'COCKLE_DARK_MODE';
    if (darkMode === undefined) {
      this.environment.delete(envVarName);
    } else {
      this.environment.set(envVarName, darkMode ? '1' : '0');
    }
  }

  private _setExitCode(exitCode: number) {
    this._exitCode = exitCode;
    this.environment.set('?', `${exitCode}`);
  }

  private async _wasmUrlQueryParams(filename: string): Promise<string> {
    const { wasmUrlQueryParamsCallback } = this._options;
    if (wasmUrlQueryParamsCallback !== undefined) {
      const params = await wasmUrlQueryParamsCallback(filename);
      const asStrings = Object.entries(params).map(([key, value]) => `${key}=${value}`);
      if (asStrings.length > 0) {
        return '?' + asStrings.join('&');
      }
    }
    return '';
  }

  private _commandLine: ICommandLine = { text: '', cursorIndex: 0 };
  private _darkMode?: boolean;
  private _exitCode: number = 0;
  private _requestedDarkMode?: boolean;
  private _isRunning = false;
  private _size: ISize = { rows: 0, columns: 0 };
  private _themeStatus = ThemeStatus.PendingChange;

  private _commandId = -1;
  private _commandModuleLoader: CommandModuleLoader;
  private _runContext: IRunContext;
  private _dummyInput = new DummyInput();
  private _dummyOutput = new DummyOutput();
  private _externalCommandPromise?: PromiseDelegate<IExternalCommandResult>;
  private _fileSystem: IFileSystem;
  private _options: IShellImpl.IOptions;
  private _stderr: TerminalOutput;
  private _tabCompleter: TabCompleter;
}

/**
 * Status of theme used to track changes and avoid multiple changes at the same time.
 */
enum ThemeStatus {
  Ok = 0,
  PendingChange = 1,
  Changing = 2
}
