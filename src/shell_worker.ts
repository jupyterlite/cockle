import { expose } from 'comlink';

import { WorkerBufferedStdin } from './buffered_stdin';
import { IShellWorker } from './defs';
import { ShellImpl } from './shell_impl';

/**
 * WebWorker running ShellImpl.
 */
export class ShellWorker implements IShellWorker {
  async initialize(
    options: IShellWorker.IOptions,
    outputCallback: IShellWorker.IProxyOutputCallback,
    enableBufferedStdinCallback: IShellWorker.IProxyEnableBufferedStdinCallback,
    terminateCallback: IShellWorker.IProxyTerminateCallback
  ) {
    this._bufferedStdin = new WorkerBufferedStdin(options.sharedArrayBuffer);
    this._outputCallback = outputCallback;
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
      outputCallback: this._outputCallback,
      enableBufferedStdinCallback: this.enableBufferedStdin.bind(this),
      terminateCallback: this._terminateCallback.bind(this),
      stdinCallback: this._bufferedStdin.get.bind(this._bufferedStdin)
    });
    await this._shellImpl.initialize();
  }

  async enableBufferedStdin(enable: boolean): Promise<void> {
    // Enable/disable webworker's buffered stdin.
    if (this._bufferedStdin) {
      if (enable) {
        await this._bufferedStdin.enable();
      } else {
        await this._bufferedStdin.disable();
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
  private _bufferedStdin?: WorkerBufferedStdin;
  private _outputCallback?: IShellWorker.IProxyOutputCallback;
  private _enableBufferedStdinCallback?: IShellWorker.IProxyEnableBufferedStdinCallback;
  private _terminateCallback?: IShellWorker.IProxyTerminateCallback;
}

const obj = new ShellWorker();
expose(obj);
