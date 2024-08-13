import { expose } from 'comlink';

import { WorkerBufferedStdin } from './buffered_stdin';
import { IShell, IShellWorker } from './defs';
import { ShellImpl } from './shell_impl';

/**
 * WebWorker running ShellImpl.
 */
export class ShellWorker implements IShell {
  async initialize(
    options: IShellWorker.IOptions,
    outputCallback: IShellWorker.IProxyOutputCallback,
    enableBufferedStdinCallback: IShellWorker.IProxyEnableBufferedStdinCallback
  ) {
    this._bufferedStdin = new WorkerBufferedStdin(options.sharedArrayBuffer);
    this._outputCallback = outputCallback;
    this._enableBufferedStdinCallback = enableBufferedStdinCallback;

    const { color, mountpoint, driveFsBaseUrl, initialDirectories, initialFiles } = options;
    this._shellImpl = new ShellImpl({
      color,
      mountpoint,
      driveFsBaseUrl,
      initialDirectories,
      initialFiles,
      outputCallback: this._outputCallback,
      enableBufferedStdinCallback: this._enableBufferedStdinCallback!,
      stdinCallback: this._bufferedStdin.get.bind(this._bufferedStdin)
    });
    await this._shellImpl.initialize();
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
}

const obj = new ShellWorker();
expose(obj);
