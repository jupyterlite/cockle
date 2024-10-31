import { ISignal, Signal } from '@lumino/signaling';

import { proxy, wrap } from 'comlink';

import { MainBufferedStdin } from './buffered_stdin';
import { IRemoteShell, IShell } from './defs';

/**
 * External-facing Shell class that external libraries use.  It communicates with the real shell
 * that runs in a WebWorker.
 */
export class Shell implements IShell {
  constructor(readonly options: IShell.IOptions) {
    this._bufferedStdin = new MainBufferedStdin();
    this._initWorker(options);
  }

  private async _initWorker(options: IShell.IOptions) {
    this._worker = new Worker(new URL('./shell_worker.js', import.meta.url), { type: 'module' });

    this._remote = wrap(this._worker);
    const { color, mountpoint, wasmBaseUrl, driveFsBaseUrl, initialDirectories, initialFiles } =
      options;
    const { sharedArrayBuffer } = this._bufferedStdin;
    await this._remote.initialize(
      {
        color,
        mountpoint,
        wasmBaseUrl,
        driveFsBaseUrl,
        sharedArrayBuffer,
        initialDirectories,
        initialFiles
      },
      proxy(options.outputCallback),
      proxy(this.enableBufferedStdinCallback.bind(this)),
      proxy(this.dispose.bind(this))
    );

    // Register sendStdinNow callback only after this._remote has been initialized.
    this._bufferedStdin.registerSendStdinNow(this._remote.input);
  }

  dispose(): void {
    if (this._isDisposed) {
      return;
    }

    console.log('Shell.dispose');
    this._isDisposed = true;

    this._remote = undefined;
    this._worker!.terminate();
    this._worker = undefined;
    (this._bufferedStdin as any) = null;

    this._disposed.emit();
  }

  get disposed(): ISignal<this, void> {
    return this._disposed;
  }

  get isDisposed(): boolean {
    return this._isDisposed;
  }

  private async enableBufferedStdinCallback(enable: boolean) {
    if (this.isDisposed) {
      return;
    }

    if (enable) {
      await this._bufferedStdin.enable();
    } else {
      await this._bufferedStdin.disable();
    }
  }

  async input(char: string): Promise<void> {
    if (this.isDisposed) {
      return;
    }

    if (this._bufferedStdin.enabled) {
      await this._bufferedStdin.push(char);
    } else {
      await this._remote!.input(char);
    }
  }

  async setSize(rows: number, columns: number): Promise<void> {
    if (this.isDisposed) {
      return;
    }

    await this._remote!.setSize(rows, columns);
  }

  async start(): Promise<void> {
    if (this.isDisposed) {
      return;
    }

    await this._remote!.start();
  }

  private _worker?: Worker;
  private _remote?: IRemoteShell;
  private _bufferedStdin: MainBufferedStdin;
  private _disposed = new Signal<this, void>(this);
  private _isDisposed = false;
}
