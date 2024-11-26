import { expose } from 'comlink';

import { WorkerBufferedIO } from './buffered_io';
import { IShellWorker } from './defs_internal';
import { ShellImpl } from './shell_impl';

/**
 * WebWorker running ShellImpl.
 */
export class ShellWorker implements IShellWorker {
  async initialize(
    options: IShellWorker.IOptions,
    enableBufferedStdinCallback: IShellWorker.IProxyEnableBufferedStdinCallback,
    terminateCallback: IShellWorker.IProxyTerminateCallback
  ) {
    this._bufferedIO = new WorkerBufferedIO(options.sharedArrayBuffer);
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
      enableBufferedStdinCallback: this.enableBufferedStdin.bind(this),
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
  private _enableBufferedStdinCallback?: IShellWorker.IProxyEnableBufferedStdinCallback;
  private _terminateCallback?: IShellWorker.IProxyTerminateCallback;
}

const obj = new ShellWorker();
expose(obj);
