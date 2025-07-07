import { Aliases } from './aliases';
import { ansi } from './ansi';
import { IWorkerIO } from './buffered_io';
import { ICommandLine } from './command_line';
import { CommandModule, CommandModuleLoader, CommandPackage, CommandRegistry } from './commands';
import { IRunContext } from './context';
import { IShellImpl } from './defs_internal';
import { Environment } from './environment';
import { ErrorExitCode, FindCommandError, GeneralError } from './error_exit_code';
import { ExitCode } from './exit_code';
import { IFileSystem } from './file_system';
import { History } from './history';
import {
  DummyInput,
  DummyOutput,
  FileInput,
  FileOutput,
  IInput,
  IOutput,
  Pipe,
  TerminalInput,
  TerminalOutput
} from './io';
import { CommandNode, parse, PipeNode } from './parse';
import { TabCompleter } from './tab_completer';
import { joinURL } from './utils';

/**
 * Shell implementation.
 */
export class ShellImpl implements IShellImpl {
  constructor(options: IShellImpl.IOptions) {
    this._options = options;
    this._commandModuleLoader = new CommandModuleLoader(
      options.wasmBaseUrl,
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

    const workerIO = options.workerIO;

    // Content within which commands are run.
    this._runContext = {
      name: '',
      args: [],
      fileSystem: this._fileSystem,
      aliases: new Aliases(),
      commandRegistry: new CommandRegistry(
        options.callExternalCommand,
        options.callExternalTabComplete
      ),
      environment: new Environment(options.color),
      history: new History(),
      shellId: options.shellId,
      terminate: this.terminate.bind(this),
      stdin: this._dummyInput,
      stdout: this._dummyOutput,
      stderr: this._dummyOutput,
      termios: options.termios,
      workerIO,
      commandModuleCache: this._commandModuleLoader.cache,
      stdinContext: options.stdinContext
    };

    // Aliases.
    Object.entries(options.aliases).forEach(([name, value]) =>
      this._runContext.aliases.set(name, value)
    );

    // Environment variables.
    Object.entries(options.environment).forEach(([name, value]) => {
      if (value === undefined) {
        this._runContext.environment.delete(name);
      } else {
        this._runContext.environment.set(name, value);
      }
    });

    // External commands.
    options.externalCommandConfigs.forEach(config =>
      this._runContext.commandRegistry.registerExternalCommand(config.name, config.hasTabComplete)
    );

    this._stderr = new TerminalOutput(
      this.output.bind(this),
      this._options.color ? ansi.styleRed : undefined,
      this._options.color ? ansi.styleReset : undefined
    );

    this._tabCompleter = new TabCompleter(this._runContext, this._options.enableBufferedStdinCallback);
  }

  get aliases(): Aliases {
    return this._runContext.aliases;
  }

  get environment(): Environment {
    return this._runContext.environment;
  }

  get exitCode(): number {
    return this._exitCode;
  }

  async externalInput(maxChars: number | null): Promise<string> {
    const chars = await this._runContext.stdin.readAsync(maxChars);
    return String.fromCharCode(...chars);
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
        case 13: {
          // \r
          this.output('\n');
          const cmdText = this._commandLine.text;
          this._commandLine.text = '';
          this._commandLine.cursorIndex = 0;
          if (cmdText.length > 0) {
            await this._runCommands(cmdText);
          }
          await this._outputPrompt();
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
        case 4: // EOT, usually = Ctrl-D
          break;
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

  async setSize(rows: number, columns: number): Promise<void> {
    const { environment } = this;

    if (rows >= 1) {
      const rowsString = rows.toString();
      environment.set('LINES', rowsString);
      environment.set('LESS_LINES', rowsString);
    } else {
      environment.delete('LINES');
      environment.delete('LESS_LINES');
    }

    if (columns >= 1) {
      const columnsString = columns.toString();
      environment.set('COLUMNS', columnsString);
      environment.set('LESS_COLUMNS', columnsString);
    } else {
      environment.delete('COLUMNS');
      environment.delete('LESS_COLUMNS');
    }
  }

  setWorkerIO(workerIO: IWorkerIO) {
    this._runContext.workerIO = workerIO;
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
            `\r${this.environment.getPrompt()}${this._commandLine.text}`
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
    let ret: string[] = [];
    let nFlags = 0;

    // ToDo:
    // - Handling of absolute paths
    // - Handling of . and .. and hidden files
    // - Wildcards in quoted strings should be ignored
    // - [ab] syntax
    // - Multiple wildcards in different directory levels in the same arg
    for (const arg of args) {
      if (arg.startsWith('-')) {
        nFlags++;
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
      ret = ret.concat(possibles);
    }

    if (ret.length === nFlags) {
      // If no matches return initial arguments.
      ret = args;
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
    const start = Date.now();
    const chars = await workerIO.readAsync(null, timeoutMs);
    console.debug('Cockle theme change', Date.now() - start, 'ms');

    termios.setDefaultShell();
    await this._options.enableBufferedStdinCallback(false);

    this._themeStatus = ThemeStatus.Ok;

    const charStr = String.fromCharCode(...chars);
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
    const fsModule = this._commandModuleLoader.getWasmModule('cockle_fs', 'fs');
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

    const mountpoint = this._fileSystem.mountpoint;
    FS.mkdirTree(mountpoint, 0o777);

    this._runContext.fileSystem.FS = FS;
    this._runContext.fileSystem.PATH = PATH;
    this._runContext.fileSystem.ERRNO_CODES = ERRNO_CODES;
    this._runContext.fileSystem.PROXYFS = PROXYFS;

    const { browsingContextId, baseUrl, initialDirectories, initialFiles } = this._options;
    this._options.initDriveFSCallback({
      browsingContextId,
      baseUrl,
      fileSystem: this._runContext.fileSystem,
      mountpoint
    });

    FS.chdir(mountpoint);
    this.environment.set('PWD', FS.cwd());

    if (initialDirectories) {
      initialDirectories.forEach((directory: string) => FS.mkdir(directory, 0o775));
    }

    if (initialFiles) {
      Object.entries(initialFiles).forEach(([filename, contents]) =>
        FS.writeFile(filename, contents, { mode: 0o664 })
      );
    }
  }

  private async _initWasmPackages(): Promise<void> {
    const url = joinURL(this._options.wasmBaseUrl, 'cockle-config.json');
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

  private async _outputPrompt(): Promise<void> {
    if (!this._isRunning) {
      return;
    }
    if (this._themeStatus === ThemeStatus.PendingChange) {
      await this._handleThemeChange();
    }
    this._runContext.workerIO.write(`\n${this.environment.getPrompt()}`);
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
      this._stdinCallback.bind(this),
      this._stdinAsyncCallback.bind(this)
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
            await this._runCommand(commands[i], input, output, stderr);
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
    const name = commandNode.name.value;
    const runner = this._runContext.commandRegistry.get(name);
    if (runner === null) {
      // Give location of command in input?
      throw new FindCommandError(name);
    }

    if (commandNode.redirects) {
      // Support single redirect only, write or append to file.
      if (commandNode.redirects.length > 1) {
        throw new GeneralError('Only implemented a single redirect per command');
      }
      const redirect = commandNode.redirects[0];
      const redirectChars = redirect.token.value;
      const path = redirect.target.value;
      if (redirectChars === '>' || redirectChars === '>>') {
        output = new FileOutput(this._runContext.fileSystem, path, redirectChars === '>>');
      } else if (redirectChars === '<') {
        input = new FileInput(this._runContext.fileSystem, path);
      } else {
        throw new GeneralError('Unrecognised redirect ' + redirectChars);
      }
    }

    // Set current properties of IContext.
    let args = commandNode.suffix.map(token => token.value);
    args = this._filenameExpansion(args);
    this._runContext.name = name;
    this._runContext.args = args;
    this._runContext.stdin = input;
    this._runContext.stdout = output;
    this._runContext.stderr = error;

    let exitCode = -1;
    try {
      exitCode = await runner.run(this._runContext);
    } finally {
      error.flush();
      output.flush();

      // Reset properties of IContext.
      this._runContext.name = '';
      this._runContext.args = [];
      this._runContext.stdin = this._dummyInput;
      this._runContext.stdout = this._dummyOutput;
      this._runContext.stderr = this._dummyOutput;
    }

    return exitCode;
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

  private _stdinCallback(maxChars: number | null): number[] {
    return this._runContext.workerIO.read(maxChars);
  }

  private async _stdinAsyncCallback(maxChars: number | null): Promise<number[]> {
    return await this._runContext.workerIO.readAsync(maxChars, 0);
  }

  private _commandLine: ICommandLine = { text: '', cursorIndex: 0 };
  private _darkMode?: boolean;
  private _exitCode: number = 0;
  private _requestedDarkMode?: boolean;
  private _isRunning = false;
  private _themeStatus = ThemeStatus.PendingChange;

  private _commandModuleLoader: CommandModuleLoader;
  private _runContext: IRunContext;
  private _dummyInput = new DummyInput();
  private _dummyOutput = new DummyOutput();
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
