import { WorkerBufferedIO } from './buffered_io';
import { IShellWorker } from './defs_internal';
import { IFileSystem } from './file_system';
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
    terminateCallback: IShellWorker.IProxyTerminateCallback
  ) {
    console.log('Cockle BaseShellWorker.initialize');
    this._bufferedIO = new WorkerBufferedIO(options.sharedArrayBuffer);
    this._downloadModuleCallback = downloadModuleCallback;
    this._enableBufferedStdinCallback = enableBufferedStdinCallback;
    this._terminateCallback = terminateCallback;

    const { color, mountpoint, wasmBaseUrl, driveFsBaseUrl, initialDirectories, initialFiles } =
      options;
    this._shellImpl = new ShellImpl({
      color,
      mountpoint,
      wasmBaseUrl,
      driveFsBaseUrl,
      initialDirectories,
      initialFiles,
      downloadModuleCallback: this._downloadModuleCallback.bind(this),
      enableBufferedStdinCallback: this.enableBufferedStdin.bind(this),
      initDriveFSCallback: this.initDriveFS.bind(this),
      terminateCallback: this._terminateCallback.bind(this),
      stdinCallback: this._bufferedIO.read.bind(this._bufferedIO),
      bufferedIO: this._bufferedIO
    });
    await this._shellImpl.initialize();
  }

  async enableBufferedStdin(enable: boolean): Promise<void> {
    // Enable/disable webworker's buffered stdin.
    if (this._bufferedIO) {
      if (enable) {
        await this._bufferedIO.enable();
      } else {
        await this._bufferedIO.disable();
      }
    }

    // Enable/disable main worker's buffered stdin.
    if (this._enableBufferedStdinCallback) {
      this._enableBufferedStdinCallback(enable);
    }
  }

  /**
   * Initialize the DriveFS to mount an external file system.
   */
  protected abstract initDriveFS(
    driveFsBaseUrl: string,
    mountpoint: string,
    fileSystem: IFileSystem
  ): void;

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
  private _bufferedIO?: WorkerBufferedIO;
  private _downloadModuleCallback?: IShellWorker.IProxyDownloadModuleCallback;
  private _enableBufferedStdinCallback?: IShellWorker.IProxyEnableBufferedStdinCallback;
  private _terminateCallback?: IShellWorker.IProxyTerminateCallback;
}
