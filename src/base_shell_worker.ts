import { IWorkerIO, SharedArrayBufferWorkerIO } from './buffered_io';
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
    downloadModuleCallback: IShellWorker.IProxyDownloadModuleCallback,
    enableBufferedStdinCallback: IShellWorker.IProxyEnableBufferedStdinCallback,
    outputCallback: IShellWorker.IProxyOutputCallback,
    terminateCallback: IShellWorker.IProxyTerminateCallback
  ) {
    console.log('Cockle BaseShellWorker.initialize');
    this._workerIO = new SharedArrayBufferWorkerIO(options.sharedArrayBuffer, outputCallback);
    this._downloadModuleCallback = downloadModuleCallback;
    this._enableBufferedStdinCallback = enableBufferedStdinCallback;
    this._terminateCallback = terminateCallback;

    this._shellImpl = new ShellImpl({
      id: options.id,
      color: options.color,
      mountpoint: options.mountpoint,
      wasmBaseUrl: options.wasmBaseUrl,
      driveFsBaseUrl: options.driveFsBaseUrl,
      browsingContextId: options.browsingContextId,
      initialDirectories: options.initialDirectories,
      initialFiles: options.initialFiles,
      downloadModuleCallback: this._downloadModuleCallback.bind(this),
      enableBufferedStdinCallback: this.enableBufferedStdin.bind(this),
      initDriveFSCallback: this.initDriveFS.bind(this),
      terminateCallback: this._terminateCallback.bind(this),
      stdinCallback: this._workerIO.read.bind(this._workerIO),
      stdinAsyncCallback: this._workerIO.readAsync.bind(this._workerIO),
      workerIO: this._workerIO
    });
    await this._shellImpl.initialize();
  }

  async enableBufferedStdin(enable: boolean): Promise<void> {
    // Enable/disable webworker's buffered stdin.
    if (this._workerIO) {
      if (enable) {
        await this._workerIO.enable();
      } else {
        await this._workerIO.disable();
      }
    }

    // Enable/disable main worker's buffered stdin.
    if (this._enableBufferedStdinCallback) {
      await this._enableBufferedStdinCallback(enable);
    }
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

  private _shellImpl?: ShellImpl;
  private _workerIO?: IWorkerIO;
  private _downloadModuleCallback?: IShellWorker.IProxyDownloadModuleCallback;
  private _enableBufferedStdinCallback?: IShellWorker.IProxyEnableBufferedStdinCallback;
  private _terminateCallback?: IShellWorker.IProxyTerminateCallback;
}
