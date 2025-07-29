import { IWorkerIO, ServiceWorkerWorkerIO, SharedArrayBufferWorkerIO } from './buffered_io';
import { StdinContext } from './context';
import { IShellWorker } from './defs_internal';
import { IDriveFSOptions } from './drive_fs';
import { ShellImpl } from './shell_impl';

/**
 * Abstract base class for web worker running ShellImpl.
 * Implementation-specific code (comlink) is here to avoid polluting ShellImpl with it.
 */
export abstract class BaseShellWorker implements IShellWorker {
  async initialize(
    options: IShellWorker.IOptions,
    callExternalCommand: IShellWorker.IProxyCallExternalCommand,
    callExternalTabComplete: IShellWorker.IProxyCallExternalTabComplete,
    downloadModuleCallback: IShellWorker.IProxyDownloadModuleCallback,
    enableBufferedStdinCallback: IShellWorker.IProxyEnableBufferedStdinCallback,
    outputCallback: IShellWorker.IProxyOutputCallback,
    setMainIOCallback: IShellWorker.IProxySetMainIOCallback,
    terminateCallback: IShellWorker.IProxyTerminateCallback
  ) {
    // Create IWorkerIO equivalents of the IMainIO used in the main UI thread (BaseShell class).
    this._stdinContext = new StdinContext(setMainIOCallback, this._setWorkerIO.bind(this));

    if (options.supportsServiceWorker) {
      this._serviceWorkerWorkerIO = new ServiceWorkerWorkerIO(
        outputCallback,
        options.baseUrl ?? '',
        options.browsingContextId ?? '',
        options.shellId
      );
      this._stdinContext!.setAvailable('sw', true);
    }
    if (options.sharedArrayBuffer !== undefined) {
      this._sharedArrayBufferWorkerIO = new SharedArrayBufferWorkerIO(
        options.sharedArrayBuffer,
        outputCallback
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

    this._downloadModuleCallback = downloadModuleCallback;
    this._enableBufferedStdinCallback = enableBufferedStdinCallback;
    this._terminateCallback = terminateCallback;

    this._shellImpl = new ShellImpl({
      shellId: options.shellId,
      color: options.color,
      mountpoint: options.mountpoint,
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
      downloadModuleCallback: this._downloadModuleCallback.bind(this),
      enableBufferedStdinCallback: this.enableBufferedStdin.bind(this),
      initDriveFSCallback: this.initDriveFS.bind(this),
      terminateCallback: this._terminateCallback.bind(this),
      workerIO: this._workerIO,
      stdinContext: this._stdinContext
    });
    await this._shellImpl.initialize();
  }

  async enableBufferedStdin(enable: boolean): Promise<void> {
    if (enable) {
      // Wait for workerIO to be disabled so can enable it.
      await this._workerIO?.canEnable();

      if (this._enableBufferedStdinCallback) {
        await this._enableBufferedStdinCallback(true);
      }
      await this._workerIO?.enable();
    } else {
      await this._workerIO?.disable();
      if (this._enableBufferedStdinCallback) {
        await this._enableBufferedStdinCallback(false);
      }
    }
  }

  async externalInput(maxChars: number | null): Promise<string> {
    return this._shellImpl!.externalInput(maxChars);
  }

  externalOutput(text: string, isStderr: boolean): void {
    this._shellImpl?.externalOutput(text, isStderr);
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

  async setSize(rows: number, columns: number): Promise<void> {
    if (this._shellImpl) {
      await this._shellImpl.setSize(rows, columns);
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

  private _shellImpl?: ShellImpl;
  private _downloadModuleCallback?: IShellWorker.IProxyDownloadModuleCallback;
  private _enableBufferedStdinCallback?: IShellWorker.IProxyEnableBufferedStdinCallback;
  private _terminateCallback?: IShellWorker.IProxyTerminateCallback;

  private _stdinContext?: StdinContext;
  private _serviceWorkerWorkerIO?: ServiceWorkerWorkerIO;
  private _sharedArrayBufferWorkerIO?: SharedArrayBufferWorkerIO;
  private _workerIO?: IWorkerIO;
}
