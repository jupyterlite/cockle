
import { PromiseDelegate } from '@lumino/coreutils';
import { ISignal, Signal } from '@lumino/signaling';

import { proxy, wrap } from 'comlink';

import { MainBufferedIO } from './buffered_io';
import { IShell } from './defs';
import { IRemoteShell } from './defs_internal';
import { DownloadTracker } from './download_tracker';

/**
 * External-facing Shell class that external libraries use.  It communicates with the real shell
 * that runs in a WebWorker.
 */
export class Shell implements IShell {
  constructor(readonly options: IShell.IOptions) {
    this._bufferedIO = new MainBufferedIO(options.outputCallback);
    this._initWorker(options).then(this._ready.resolve.bind(this._ready));
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
      proxy(this.downloadWasmModuleCallback.bind(this)),
      proxy(this.enableBufferedStdinCallback.bind(this)),
      proxy(this.dispose.bind(this)) // terminateCallback
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

    if (this._downloadTracker !== undefined) {
      this._downloadTracker!.dispose();
      this._downloadTracker = undefined;
    }

    this._bufferedIO.dispose();
    (this._bufferedIO as any) = undefined;

    this._disposed.emit();
  }

  get disposed(): ISignal<this, void> {
    return this._disposed;
  }

  downloadWasmModuleCallback(packageName: string, moduleName: string, start: boolean): void {
    if (start) {
      if (this._downloadTracker !== undefined) {
        this._downloadTracker.dispose();
      }

      this._downloadTracker = new DownloadTracker(
        packageName,
        moduleName,
        this.options.outputCallback
      );
      this._downloadTracker.start();
    } else {
      if (
        this._downloadTracker !== undefined &&
        packageName === this._downloadTracker.packageName &&
        moduleName === this._downloadTracker.moduleName
      ) {
        this._downloadTracker.stop();
      }
    }
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

  /**
   * A promise that is fulfilled when the terminal is ready to be started.
   */
  get ready(): Promise<void> {
    return this._ready.promise;
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

    await this.ready;
    await this._bufferedIO.start();
    await this._remote!.start();
  }

  private _worker?: Worker;
  private _remote?: IRemoteShell;
  private _bufferedIO: MainBufferedIO;
  private _disposed = new Signal<this, void>(this);
  private _isDisposed = false;
  private _ready = new PromiseDelegate<void>();
  private _downloadTracker?: DownloadTracker;
}
