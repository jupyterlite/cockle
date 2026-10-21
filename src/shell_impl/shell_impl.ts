import { PromiseDelegate } from '@lumino/coreutils';
import { CommandExecutor } from './command_execution';
import type { IInitOptions } from './initialization';
import { initFileSystem, initWasmPackages } from './initialization';
import { LineEditor } from './line_editor';
import { ThemeManager } from './theme';
import { Aliases } from '../aliases';
import { ansi } from '../ansi';
import type { IWorkerIO } from '../buffered_io';
import type { ISize } from '../callback';
import type { IExternalCommandResult } from '../callback_internal';
import { CommandModuleLoader, CommandRegistry } from '../commands';
import type { IRunContext } from '../context';
import type { IShellImpl } from '../defs_internal';
import { Environment } from '../environment';
import { expandString } from '../expand';
import type { IFileSystem } from '../file_system';
import { History } from '../history';
import type { IOutput } from '../io';
import { DummyInput, DummyOutput, TerminalOutput } from '../io';
import { TabCompleter } from '../tab_completer';
import type { Termios } from '../termios';
import { stringFromCharCodes } from '../utils';

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
      environment: Environment.createDefault(
        options.color,
        options.shellId,
        options.browsingContextId,
        options.user
      ),
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

    this._theme = new ThemeManager(options, {
      stderr: this._stderr,
      environment: () => this.environment,
      output: this.output.bind(this)
    });

    this._commandExecutor = new CommandExecutor(
      options,
      this._runContext,
      this._stderr,
      this._dummyInput,
      this._dummyOutput,
      {
        output: this.output.bind(this),
        outputPrompt: this._outputPrompt.bind(this),
        setExitCode: this._setExitCode.bind(this)
      }
    );

    this._lineEditor = new LineEditor(
      {
        aliases: this._runContext.aliases,
        history: this._runContext.history,
        environment: () => this.environment,
        output: this.output.bind(this),
        outputPrompt: this._outputPrompt.bind(this),
        runCommands: text => this._commandExecutor.runCommands(text),
        terminate: this.terminate.bind(this)
      },
      new TabCompleter(
        this._runContext,
        this._options.enableBufferedStdinCallback,
        this._options.termios
      )
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
    const initOptions: IInitOptions = {
      commandModuleLoader: this._commandModuleLoader,
      shellImplOptions: this._options,
      runContext: this._runContext,
      wasmUrlQueryParams: this._wasmUrlQueryParams.bind(this)
    };

    await initWasmPackages(initOptions);

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

    await initFileSystem(initOptions);
  }

  async input(chars: string): Promise<void> {
    if (!this._isRunning) {
      return;
    }
    await this._lineEditor.input(chars);
  }

  output(text: string): void {
    if (!this._isRunning) {
      return;
    }
    this._runContext.workerIO.write(text);
  }

  // Runs commands directly, bypassing the line editor. Used by integration tests.
  async _runCommands(cmdText: string): Promise<void> {
    await this._commandExecutor.runCommands(cmdText);
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
    if (this._theme.request(isDark) && !this._runContext.workerIO.enabled) {
      await this._theme.resolve();
    }
  }

  private async _outputPrompt(promptIndex: number = 1): Promise<void> {
    if (!this._isRunning) {
      return;
    }
    if (this._theme.isPending()) {
      await this._theme.resolve();
    }
    // Get prompt just before using as a theme change above can change the PS1 prompt colors.
    const prompt = expandString(this.environment.getPrompt(promptIndex), this.environment);
    this._runContext.workerIO.write(`\n${prompt}`);
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

  private _exitCode: number = 0;
  private _isRunning = false;
  private _size: ISize = { rows: 0, columns: 0 };

  private _commandExecutor: CommandExecutor;
  private _commandModuleLoader: CommandModuleLoader;
  private _lineEditor: LineEditor;
  private _runContext: IRunContext;
  private _dummyInput = new DummyInput();
  private _dummyOutput = new DummyOutput();
  private _externalCommandPromise?: PromiseDelegate<IExternalCommandResult>;
  private _fileSystem: IFileSystem;
  private _options: IShellImpl.IOptions;
  private _stderr: TerminalOutput;
  private _theme: ThemeManager;
}
