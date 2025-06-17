import { Aliases } from './aliases';
import { ansi } from './ansi';
import { IWorkerIO } from './buffered_io';
import { IContext } from './context';
import { IShellImpl, IShellWorker } from './defs_internal';
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
import { CommandNode, PipeNode, parse } from './parse';
import { longestStartsWith, toColumns } from './utils';
import { CommandModule } from './commands/command_module';
import { CommandModuleLoader } from './commands/command_module_loader';
import { CommandPackage } from './commands/command_package';
import { CommandRegistry } from './commands/command_registry';
import { joinURL } from './utils';

/**
 * Shell implementation.
 */
export class ShellImpl implements IShellWorker {
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

    // Content within which commands are run,
    this._context = {
      args: [],
      fileSystem: this._fileSystem,
      aliases: new Aliases(),
      commandRegistry: new CommandRegistry(options.callExternalCommand),
      environment: new Environment(options.color),
      history: new History(),
      terminate: this.terminate.bind(this),
      stdin: this._dummyInput,
      stdout: this._dummyOutput,
      stderr: this._dummyOutput,
      workerIO: options.workerIO,
      commandModuleCache: this._commandModuleLoader.cache,
      stdinContext: options.stdinContext
    };

    options.externalCommandNames.forEach(name =>
      this._context.commandRegistry.registerExternalCommand(name)
    );
  }

  get aliases(): Aliases {
    return this._context.aliases;
  }

  get environment(): Environment {
    return this._context.environment;
  }

  async externalInput(maxChars: number | null): Promise<string> {
    const chars = await this._context.stdin.readAsync(maxChars);
    return String.fromCharCode(...chars);
  }

  externalOutput(text: string, isStderr: boolean): void {
    // Pass output from an external command to the current IOutput.
    const output: IOutput = isStderr ? this._context.stderr : this._context.stdout;
    output.write(text);
  }

  get history(): History {
    return this._context.history;
  }

  async initialize() {
    await this._initWasmPackages();
    await this._initFileSystem();
  }

  async input(char: string): Promise<void> {
    if (!this._isRunning) {
      return;
    }

    // Might be a multi-char string if begins with escape code.
    const code = char.charCodeAt(0);
    switch (code) {
      case 13: {
        // \r
        this.output('\n');
        const cmdText = this._currentLine;
        this._currentLine = '';
        this._cursorIndex = 0;
        await this._runCommands(cmdText);
        this._outputPrompt();
        break;
      }
      case 127: // Backspace
        if (this._cursorIndex > 0) {
          const suffix = this._currentLine.slice(this._cursorIndex);
          this._currentLine = this._currentLine.slice(0, this._cursorIndex - 1) + suffix;
          this._cursorIndex--;
          this.output(
            ansi.cursorLeft(1) + suffix + ansi.eraseEndLine + ansi.cursorLeft(suffix.length)
          );
        }
        break;
      case 9: // Tab \t
        await this._tabComplete();
        break;
      case 27: // Escape following by 1+ more characters
        this._escapedInput(char);
        break;
      case 4: // EOT, usually = Ctrl-D
        break;
      default:
        // Add char to command line at cursor position.
        if (this._cursorIndex === this._currentLine.length) {
          // Append char.
          this._currentLine += char;
          this.output(char);
        } else {
          // Insert char.
          const suffix = this._currentLine.slice(this._cursorIndex);
          this._currentLine = this._currentLine.slice(0, this._cursorIndex) + char + suffix;
          this.output(ansi.eraseEndLine + char + suffix + ansi.cursorLeft(suffix.length));
        }
        this._cursorIndex++;
        break;
    }
  }

  output(text: string): void {
    if (!this._isRunning) {
      return;
    }
    this._context.workerIO.write(text);
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
    this._context.workerIO = workerIO;
  }

  async start(): Promise<void> {
    this._isRunning = true;
    this._outputPrompt();
  }

  terminate() {
    console.log('Cockle ShellImpl.terminate');
    this._isRunning = false;
    this._options.terminateCallback();
  }

  /**
   * Handle input where the first character is an escape (ascii 27).
   */
  private async _escapedInput(char: string): Promise<void> {
    const remainder = char.slice(1);
    switch (remainder) {
      case '[A': // Up arrow
      case '[1A':
      case '[B': // Down arrow
      case '[1B': {
        const cmdText = this.history.scrollCurrent(remainder.endsWith('B'));
        this._currentLine = cmdText !== null ? cmdText : '';
        this._cursorIndex = this._currentLine.length;
        // Re-output whole line.
        this.output(ansi.eraseStartLine + `\r${this.environment.getPrompt()}${this._currentLine}`);
        break;
      }
      case '[D': // Left arrow
      case '[1D':
        if (this._cursorIndex > 0) {
          this._cursorIndex--;
          this.output(ansi.cursorLeft());
        }
        break;
      case '[C': // Right arrow
      case '[1C':
        if (this._cursorIndex < this._currentLine.length) {
          this._cursorIndex++;
          this.output(ansi.cursorRight());
        }
        break;
      case '[3~': // Delete
        if (this._cursorIndex < this._currentLine.length) {
          const suffix = this._currentLine.slice(this._cursorIndex + 1);
          this._currentLine = this._currentLine.slice(0, this._cursorIndex) + suffix;
          this.output(ansi.eraseEndLine + suffix + ansi.cursorLeft(suffix.length));
        }
        break;
      case '[H': // Home
      case '[1;2H':
        if (this._cursorIndex > 0) {
          this.output(ansi.cursorLeft(this._cursorIndex));
          this._cursorIndex = 0;
        }
        break;
      case '[F': // End
      case '[1;2F': {
        const { length } = this._currentLine;
        if (this._cursorIndex < length) {
          this.output(ansi.cursorRight(length - this._cursorIndex));
          this._cursorIndex = length;
        }
        break;
      }
      case '[1;2D': // Start of previous word
      case '[1;5D':
        if (this._cursorIndex > 0) {
          const index =
            this._currentLine.slice(0, this._cursorIndex).trimEnd().lastIndexOf(' ') + 1;
          this.output(ansi.cursorLeft(this._cursorIndex - index));
          this._cursorIndex = index;
        }
        break;
      case '[1;2C': // End of next word
      case '[1;5C': {
        const { length } = this._currentLine;
        if (this._cursorIndex < length - 1) {
          const end = this._currentLine.slice(this._cursorIndex);
          const trimmed = end.trimStart();
          const i = trimmed.indexOf(' ');
          const index = i < 0 ? length : this._cursorIndex + end.length - trimmed.length + i;
          this.output(ansi.cursorRight(index - this._cursorIndex));
          this._cursorIndex = index;
        }
        break;
      }
      default:
        break;
    }
  }

  private _filenameExpansion(args: string[]): string[] {
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

      const { FS } = this._context.fileSystem!;
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
        possibles = possibles.map((path: string) => relativePath + '/' + path);
      }
      ret = ret.concat(possibles);
    }

    if (ret.length === nFlags) {
      // If no matches return initial arguments.
      ret = args;
    }

    return ret;
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

    this._context.fileSystem.FS = FS;
    this._context.fileSystem.PATH = PATH;
    this._context.fileSystem.ERRNO_CODES = ERRNO_CODES;
    this._context.fileSystem.PROXYFS = PROXYFS;

    const { browsingContextId, baseUrl, initialDirectories, initialFiles } = this._options;
    this._options.initDriveFSCallback({
      browsingContextId,
      baseUrl,
      fileSystem: this._context.fileSystem,
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
      this._context.commandRegistry.registerCommandPackage(commandPackage);
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
  }

  private _outputPrompt(): void {
    if (!this._isRunning) {
      return;
    }
    this._context.workerIO.write(`\n${this.environment.getPrompt()}`);
  }

  private async _runCommands(cmdText: string): Promise<void> {
    await this._options.enableBufferedStdinCallback(true);
    this._context.workerIO.allowAdjacentNewline(true);

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
        this._outputPrompt();
        return;
      }
      cmdText = possibleCmd;
    }

    this.history.add(cmdText);

    let exitCode!: number;
    const stdin = new TerminalInput(
      this._stdinCallback.bind(this),
      this._stdinAsyncCallback.bind(this)
    );
    const stdout = new TerminalOutput(this.output.bind(this));
    const stderr = new TerminalOutput(
      this.output.bind(this),
      this._options.color ? ansi.styleBoldRed : null,
      this._options.color ? ansi.styleReset : null
    );
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
      this.environment.set('?', `${exitCode}`);

      this._context.workerIO.allowAdjacentNewline(false);
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
    const runner = this._context.commandRegistry.get(name);
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
        output = new FileOutput(this._context.fileSystem, path, redirectChars === '>>');
      } else if (redirectChars === '<') {
        input = new FileInput(this._context.fileSystem, path);
      } else {
        throw new GeneralError('Unrecognised redirect ' + redirectChars);
      }
    }

    // Set current properties of IContext.
    let args = commandNode.suffix.map(token => token.value);
    args = this._filenameExpansion(args);
    this._context.args = args;
    this._context.stdin = input;
    this._context.stdout = output;
    this._context.stderr = error;

    let exitCode = -1;
    try {
      exitCode = await runner.run(name, this._context);
    } finally {
      error.flush();
      output.flush();

      // Reset properties of IContext.
      this._context.args = [];
      this._context.stdin = this._dummyInput;
      this._context.stdout = this._dummyOutput;
      this._context.stderr = this._dummyOutput;
    }

    return exitCode;
  }

  private _stdinCallback(maxChars: number | null): number[] {
    return this._context.workerIO.read(maxChars);
  }

  private async _stdinAsyncCallback(maxChars: number | null): Promise<number[]> {
    return await this._context.workerIO.readAsync(maxChars);
  }

  private async _tabComplete(): Promise<void> {
    const text = this._currentLine.slice(0, this._cursorIndex);
    if (text.endsWith(' ') && text.trim().length > 0) {
      return;
    }

    const suffix = this._currentLine.slice(this._cursorIndex);
    const parsed = parse(text, false);
    const [lastToken, isCommand] =
      parsed.length > 0 ? parsed[parsed.length - 1].lastToken() : [null, true];
    let lookup = lastToken?.value ?? '';

    let possibles: string[] = [];
    if (isCommand) {
      const commandMatches = this._context.commandRegistry.match(lookup);
      const aliasMatches = this.aliases.match(lookup);
      // Combine, removing duplicates, and sort.
      possibles = [...new Set([...commandMatches, ...aliasMatches])].sort();
    } else {
      // Is filename.
      const { FS } = this._context.fileSystem;
      const analyze = FS.analyzePath(lookup, false);
      if (!analyze.parentExists) {
        return;
      }

      const initialLookup = lookup;
      lookup = analyze.name;
      const { exists } = analyze;
      if (exists && !FS.isDir(FS.stat(analyze.path, false).mode)) {
        // Exactly matches a filename.
        possibles = [lookup];
      } else {
        const lookupPath = exists ? analyze.path : analyze.parentPath;
        possibles = FS.readdir(lookupPath);

        if (exists) {
          const wantDot =
            initialLookup === '.' ||
            initialLookup === '..' ||
            initialLookup.endsWith('/.') ||
            initialLookup.endsWith('/..');
          if (wantDot) {
            possibles = possibles.filter((path: string) => path.startsWith('.'));
          } else {
            possibles = possibles.filter((path: string) => !path.startsWith('.'));
            if (!initialLookup.endsWith('/')) {
              this._currentLine += '/';
            }
          }
        } else {
          possibles = possibles.filter((path: string) => path.startsWith(lookup));
        }

        // Directories are displayed with appended /
        possibles = possibles.map((path: string) =>
          FS.isDir(FS.stat(lookupPath + '/' + path, false).mode) ? path + '/' : path
        );
      }
    }

    if (possibles.length === 1) {
      let extra = possibles[0].slice(lookup.length);
      if (!extra.endsWith('/')) {
        extra += ' ';
      }
      this._currentLine = this._currentLine.slice(0, this._cursorIndex) + extra + suffix;
      this._cursorIndex += extra.length;
      this.output(extra + suffix + ansi.cursorLeft(suffix.length));
    } else if (possibles.length > 1) {
      // Multiple possibles.
      const startsWith = longestStartsWith(possibles, lookup.length);
      if (startsWith.length > lookup.length) {
        // Complete up to the longest common startsWith.
        const extra = startsWith.slice(lookup.length);
        this._currentLine = this._currentLine.slice(0, this._cursorIndex) + extra + suffix;
        this._cursorIndex += extra.length;
        this.output(extra + suffix + ansi.cursorLeft(suffix.length));
      } else {
        // Write all the possibles in columns across the terminal.
        const lines = toColumns(possibles, this.environment.getNumber('COLUMNS') ?? 0);
        const output = `\n${lines.join('\n')}\n${this.environment.getPrompt()}${this._currentLine}`;
        this.output(output + ansi.cursorLeft(suffix.length));
      }
    }
  }

  private _currentLine: string = '';
  private _cursorIndex: number = 0;
  private _isRunning = false;

  private _commandModuleLoader: CommandModuleLoader;
  private _context: IContext;
  private _dummyInput = new DummyInput();
  private _dummyOutput = new DummyOutput();
  private _fileSystem: IFileSystem;
  private _options: IShellImpl.IOptions;
}
