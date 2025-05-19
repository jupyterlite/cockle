import { PromiseDelegate, UUID } from '@lumino/coreutils';
import { ISignal, Signal } from '@lumino/signaling';

import { proxy, wrap } from 'comlink';

import { SharedArrayBufferMainIO } from './buffered_io';
import { IShell } from './defs';
import { IRemoteShell } from './defs_internal';
import { DownloadTracker } from './download_tracker';
import { ShellManager } from './shell_manager';

/**
 * Abstract base class for Shell that external libraries use.
 * It communicates with the real shell that runs in a web worker.
 */
export abstract class BaseShell implements IShell {
  constructor(readonly options: IShell.IOptions) {
    this._shellId = options.shellId ?? UUID.uuid4();
    ShellManager.register(this);

    this._mainIO = new SharedArrayBufferMainIO();
    this._worker = this.initWorker(options);
    this._initRemote(options).then(this._ready.resolve.bind(this._ready));
  }

  /**
   * Load the web worker.
   */
  protected abstract initWorker(options: IShell.IOptions): Worker;

  private async _initRemote(options: IShell.IOptions) {
    this._remote = wrap(this._worker);
    const { sharedArrayBuffer } = this._mainIO;
    await this._remote.initialize(
      {
        shellId: this._shellId,
        color: options.color ?? true,
        mountpoint: options.mountpoint,
        baseUrl: options.baseUrl,
        wasmBaseUrl: options.wasmBaseUrl,
        browsingContextId: options.browsingContextId,
        sharedArrayBuffer,
        initialDirectories: options.initialDirectories,
        initialFiles: options.initialFiles
      },
      proxy(this.downloadWasmModuleCallback.bind(this)),
      proxy(this.enableBufferedStdinCallback.bind(this)),
      proxy(options.outputCallback),
      proxy(this.dispose.bind(this)) // terminateCallback
    );

    // Register sendStdinNow callback only after this._remote has been initialized.
    this._mainIO.registerSendStdinNow(this._remote.input);
  }

  dispose(): void {
    if (this._isDisposed) {
      return;
    }

    console.log('Cockle Shell disposed');
    this._isDisposed = true;

    ShellManager.unregister(this);
    this._remote = undefined;
    this._worker!.terminate();

    if (this._downloadTracker !== undefined) {
      this._downloadTracker!.dispose();
      this._downloadTracker = undefined;
    }

    this._mainIO.dispose();
    (this._mainIO as any) = undefined;

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

  private async enableBufferedStdinCallback(enable: boolean): Promise<void> {
    if (this.isDisposed) {
      return;
    }

    if (enable) {
      await this._mainIO.enable();
    } else {
      await this._mainIO.disable();
    }
  }

  async input(char: string): Promise<void> {
    if (this.isDisposed) {
      return;
    }

    if (this._mainIO.enabled) {
      await this._mainIO.push(char);
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

  get shellId(): string {
    return this._shellId;
  }

  async start(): Promise<void> {
    if (this.isDisposed) {
      return;
    }

    await this.ready;
    await this._remote!.start();
  }

  private _disposed = new Signal<this, void>(this);
  private _isDisposed = false;
  private _ready = new PromiseDelegate<void>();

  private _shellId: string;
  private _worker: Worker;
  private _remote?: IRemoteShell;
  private _mainIO: SharedArrayBufferMainIO;

  private _downloadTracker?: DownloadTracker;
}
