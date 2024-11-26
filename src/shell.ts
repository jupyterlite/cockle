import { ISignal, Signal } from '@lumino/signaling';

import { proxy, wrap } from 'comlink';

import { MainBufferedIO } from './buffered_io';
import { IShell } from './defs';
import { IRemoteShell } from './defs_internal';

/**
 * External-facing Shell class that external libraries use.  It communicates with the real shell
 * that runs in a WebWorker.
 */
export class Shell implements IShell {
  constructor(readonly options: IShell.IOptions) {
    this._bufferedIO = new MainBufferedIO(options.outputCallback);
    this._initWorker(options);
  }

  private async _initWorker(options: IShell.IOptions) {
    this._worker = new Worker(new URL('./shell_worker.js', import.meta.url), { type: 'module' });

    this._remote = wrap(this._worker);
    const { mountpoint, wasmBaseUrl, driveFsBaseUrl, initialDirectories, initialFiles } = options;
    const { sharedArrayBuffer } = this._bufferedIO;
    await this._remote.initialize(
      {
        color: options.color ?? true,
        mountpoint,
        wasmBaseUrl,
        driveFsBaseUrl,
        sharedArrayBuffer,
        initialDirectories,
        initialFiles
      },
      proxy(this.enableBufferedStdinCallback.bind(this)),
      proxy(this.dispose.bind(this))
    );

    // Register sendStdinNow callback only after this._remote has been initialized.
    this._bufferedIO.registerSendStdinNow(this._remote.input);
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

    this._bufferedIO.dispose();
    (this._bufferedIO as any) = undefined;

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
      await this._bufferedIO.enable();
    } else {
      await this._bufferedIO.disable();
    }
  }

  async input(char: string): Promise<void> {
    if (this.isDisposed) {
      return;
    }

    if (this._bufferedIO.enabled) {
      await this._bufferedIO.push(char);
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

    await this._bufferedIO.start();
    await this._remote!.start();
  }

  private _worker?: Worker;
  private _remote?: IRemoteShell;
  private _bufferedIO: MainBufferedIO;
  private _disposed = new Signal<this, void>(this);
  private _isDisposed = false;
}
