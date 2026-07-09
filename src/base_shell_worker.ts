import type { IWorkerIO } from './buffered_io';
import { ServiceWorkerWorkerIO, SharedArrayBufferWorkerIO } from './buffered_io';
import type { IOutputCallback, IQueryParamsCallback, ISize } from './callback';
import type {
  ICallExternalCommandNoReturn,
  ICallExternalTabComplete,
  IDownloadModuleCallback,
  IEnableBufferedStdinCallback,
  IExternalCommandResult,
  IExternalInputReturnCallback,
  ISetMainIOCallback,
  ITerminateCallback,
  IWorkerCallbacks
} from './callback_internal';
import { StdinContext } from './context';
import type { IShellWorker } from './defs_internal';
import type { IDriveFSOptions } from './drive_fs';
import { ShellImpl } from './shell_impl';
import { Termios } from './termios';

/**
 * Abstract base class for web worker running ShellImpl.
 * Implementation-specific code (comlink) is here to avoid polluting ShellImpl with it.
 */
export abstract class BaseShellWorker implements IShellWorker {
  async initialize(options: IShellWorker.IOptions) {
    const callbacks = this._callbacks;
    if (callbacks === undefined) {
      throw new Error('Callbacks not registered in BaseShellWorker');
    }

    // Create IWorkerIO equivalents of the IMainIO used in the main UI thread (BaseShell class).
    this._stdinContext = new StdinContext(
      callbacks.setMainIOCallback,
      this._setWorkerIO.bind(this)
    );

    if (options.supportsServiceWorker) {
      this._serviceWorkerWorkerIO = new ServiceWorkerWorkerIO(
        callbacks.outputCallback,
        this._termios,
        options.baseUrl ?? '',
        options.browsingContextId ?? '',
        options.shellId
      );
      this._stdinContext!.setAvailable('sw', true);
    }
    if (options.sharedArrayBuffer !== undefined) {
      this._sharedArrayBufferWorkerIO = new SharedArrayBufferWorkerIO(
        callbacks.outputCallback,
        this._termios,
        options.sharedArrayBuffer
      );
      this._stdinContext.setAvailable('sab', true);
    }
    this._workerIO = this._sharedArrayBufferWorkerIO ?? this._serviceWorkerWorkerIO;
    if (this._workerIO === undefined) {
      // This should not occur as BaseShell will abort before creating worker if neither
      // SharedArrayBuffer nor ServiceWorker are available.
      throw new Error('ABORT: does not support SharedArrayBuffer or ServiceWorker!');
    }

    this._stdinContext.setEnabled(
      this._workerIO === this._sharedArrayBufferWorkerIO ? 'sab' : 'sw'
    );

    const {
      callExternalCommand,
      callExternalTabComplete,
      downloadModuleCallback,
      terminateCallback,
      wasmUrlQueryParamsCallback
    } = callbacks;

    this._shellImpl = new ShellImpl({
      shellId: options.shellId,
      color: options.color,
      mountpoint: options.mountpoint,
      cwd: options.cwd,
      baseUrl: options.baseUrl,
      wasmBaseUrl: options.wasmBaseUrl,
      browsingContextId: options.browsingContextId,
      aliases: options.aliases,
      environment: options.environment,
      externalCommandConfigs: options.externalCommandConfigs,
      initialDirectories: options.initialDirectories,
      initialFiles: options.initialFiles,
      callExternalCommand,
      callExternalTabComplete,
      downloadModuleCallback,
      enableBufferedStdinCallback: this.enableBufferedStdin.bind(this),
      initDriveFSCallback: this.initDriveFS.bind(this),
      terminateCallback,
      workerIO: this._workerIO,
      stdinContext: this._stdinContext,
      termios: this._termios,
      wasmUrlQueryParamsCallback
    });
    await this._shellImpl.initialize();
  }

  async enableBufferedStdin(enable: boolean): Promise<void> {
    if (enable) {
      // Wait for workerIO to be disabled so can enable it.
      await this._workerIO?.canEnable();

      if (this._callbacks !== undefined) {
        await this._callbacks.enableBufferedStdinCallback(true);
      }
      await this._workerIO?.enable();
    } else {
      if (this._callbacks !== undefined) {
        await this._callbacks.enableBufferedStdinCallback(false);
      }
      await this._workerIO?.disable();
    }
  }

  get exitCode(): number {
    return this._shellImpl?.exitCode ?? 1;
  }

  exitExternalCommand(result: IExternalCommandResult): void {
    this._shellImpl?.exitExternalCommand(result);
  }

  externalInput(maxChars: number | null): void {
    this._shellImpl!.externalInput(maxChars).then(input =>
      this._callbacks!.externalInputReturn(input)
    );
  }

  externalOutput(text: string, isStderr: boolean): void {
    this._shellImpl?.externalOutput(text, isStderr);
  }

  externalSetTermios(flags: Termios.IFlags): void {
    this._termios.set(flags);
  }

  /**
   * Initialize the DriveFS to mount an external file system.
   */
  protected abstract initDriveFS(options: IDriveFSOptions): void;

  async input(char: string): Promise<void> {
    if (this._shellImpl) {
      await this._shellImpl.input(char);
    }
  }

  registerCallbacks(
    callExternalCommand: ICallExternalCommandNoReturn,
    callExternalTabComplete: ICallExternalTabComplete,
    downloadModuleCallback: IDownloadModuleCallback,
    enableBufferedStdinCallback: IEnableBufferedStdinCallback,
    externalInputReturn: IExternalInputReturnCallback,
    outputCallback: IOutputCallback,
    setMainIOCallback: ISetMainIOCallback,
    terminateCallback: ITerminateCallback,
    wasmUrlQueryParamsCallback?: IQueryParamsCallback
  ) {
    this._callbacks = {
      callExternalCommand,
      callExternalTabComplete,
      downloadModuleCallback,
      enableBufferedStdinCallback,
      externalInputReturn,
      outputCallback,
      setMainIOCallback,
      terminateCallback,
      wasmUrlQueryParamsCallback
    };
  }

  setSize(size: ISize): void {
    if (this._shellImpl) {
      this._shellImpl.setSize(size);
    }
  }

  async start(): Promise<void> {
    if (this._shellImpl) {
      await this._shellImpl.start();
    }
  }

  async themeChange(isDark?: boolean): Promise<void> {
    await this._shellImpl?.themeChange(isDark);
  }

  private _setWorkerIO(shortName: string): void {
    const oldWorkerIO = this._workerIO;

    if (shortName === 'sab' && this._sharedArrayBufferWorkerIO !== undefined) {
      this._workerIO = this._sharedArrayBufferWorkerIO;
    } else if (shortName === 'sw' && this._serviceWorkerWorkerIO !== undefined) {
      this._workerIO = this._serviceWorkerWorkerIO;
    } else {
      throw new Error(`Cannot set WorkerIO to '${shortName}'`);
    }

    // Disable old worker IO before switching it. This is a no-op if already disabled.
    oldWorkerIO?.disable();

    this._shellImpl?.setWorkerIO(this._workerIO);
  }

  private _callbacks?: IWorkerCallbacks;
  private _shellImpl?: ShellImpl;

  private _stdinContext?: StdinContext;
  private _serviceWorkerWorkerIO?: ServiceWorkerWorkerIO;
  private _sharedArrayBufferWorkerIO?: SharedArrayBufferWorkerIO;
  private _termios = new Termios.Termios();
  private _workerIO?: IWorkerIO;
}
