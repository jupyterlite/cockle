import { PromiseDelegate, UUID } from '@lumino/coreutils';
import { ISignal, Signal } from '@lumino/signaling';

import { proxy, wrap } from 'comlink';

import { ansi } from './ansi';
import {
  IMainIO,
  IStdinReply,
  IStdinRequest,
  ServiceWorkerMainIO,
  SharedArrayBufferMainIO
} from './buffered_io';
import { IShell } from './defs';
import { IRemoteShell } from './defs_internal';
import { DownloadTracker } from './download_tracker';

/**
 * Abstract base class for Shell that external libraries use.
 * It communicates with the real shell that runs in a web worker.
 */
export abstract class BaseShell implements IShell {
  constructor(readonly options: IShell.IOptions) {
    this._shellId = options.shellId ?? UUID.uuid4();

    if (this.options.shellManager !== undefined) {
      this.options.shellManager.registerShell(
        this._shellId,
        this,
        this._serviceWorkerStdinHandler.bind(this)
      );
    }

    this._initialize();
  }

  /**
   * Load the web worker.
   */
  protected abstract initWorker(options: IShell.IOptions): Worker;

  dispose(): void {
    if (this._isDisposed) {
      return;
    }

    console.log('Cockle Shell disposed');
    this._isDisposed = true;

    this._remote = undefined;
    this._worker!.terminate();

    if (this._downloadTracker !== undefined) {
      this._downloadTracker!.dispose();
      this._downloadTracker = undefined;
    }

    if (this._sharedArrayBufferMainIO !== undefined) {
      this._sharedArrayBufferMainIO.dispose();
      this._sharedArrayBufferMainIO = undefined;
    }
    if (this._serviceWorkerMainIO !== undefined) {
      this._serviceWorkerMainIO.dispose();
      this._serviceWorkerMainIO = undefined;
    }
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
      await this._mainIO?.enable();
    } else {
      await this._mainIO?.disable();
    }
  }

  async input(char: string): Promise<void> {
    if (this.isDisposed) {
      return;
    }

    if (this._mainIO?.enabled) {
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

  private async _initialize(): Promise<void> {
    const supportsSharedArrayBuffer = window.crossOriginIsolated;
    if (supportsSharedArrayBuffer) {
      this._sharedArrayBufferMainIO = new SharedArrayBufferMainIO();
    }

    let supportsServiceWorker = false;
    if (this.options.browsingContextId !== undefined) {
      this._serviceWorkerMainIO = new ServiceWorkerMainIO(
        this.options.baseUrl,
        this.options.browsingContextId,
        this.shellId
      );

      // Do not trust that service worker is functioning, test it.
      await this._serviceWorkerMainIO.enable();
      const ok = await this._serviceWorkerMainIO.testWithTimeout(1000);
      await this._serviceWorkerMainIO.disable();
      if (ok) {
        console.log('Service worker supports terminal stdin');
        supportsServiceWorker = true;
      } else {
        console.log('Service worker does not support terminal stdin');
        this._serviceWorkerMainIO.dispose();
        this._serviceWorkerMainIO = undefined;
      }
    }

    if (!supportsSharedArrayBuffer && !supportsServiceWorker) {
      let msg = 'ERROR: Terminal needs either SharedArrayBuffer or ServiceWorker available.';
      console.error(msg);
      if (this.options.color ?? true) {
        msg = ansi.styleBoldRed + msg + ansi.styleReset;
      }
      this.options.outputCallback(msg);
      this.dispose();
      return;
    }

    this._mainIO = this._sharedArrayBufferMainIO ?? this._serviceWorkerMainIO;

    this._worker = this.initWorker(this.options);
    this._initRemote(this.options).then(this._ready.resolve.bind(this._ready));
  }

  private async _initRemote(options: IShell.IOptions) {
    this._remote = wrap(this._worker!);

    // Types of buffered IO supported.
    const sharedArrayBuffer = this._sharedArrayBufferMainIO?.sharedArrayBuffer ?? undefined;
    const supportsServiceWorker = this._serviceWorkerMainIO !== undefined;

    await this._remote.initialize(
      {
        shellId: this.shellId,
        color: options.color ?? true,
        mountpoint: options.mountpoint,
        wasmBaseUrl: options.wasmBaseUrl,
        baseUrl: options.baseUrl,
        browsingContextId: options.browsingContextId,
        sharedArrayBuffer,
        supportsServiceWorker,
        initialDirectories: options.initialDirectories,
        initialFiles: options.initialFiles
      },
      proxy(this.downloadWasmModuleCallback.bind(this)),
      proxy(this.enableBufferedStdinCallback.bind(this)),
      proxy(options.outputCallback),
      proxy(this._setMainIO.bind(this)),
      proxy(this.dispose.bind(this)) // terminateCallback
    );

    // Register sendStdinNow callback only after this._remote has been initialized.
    if (this._sharedArrayBufferMainIO !== undefined) {
      this._sharedArrayBufferMainIO.registerSendStdinNow(this._remote.input);
    }
    if (this._serviceWorkerMainIO !== undefined) {
      this._serviceWorkerMainIO.registerSendStdinNow(this._remote.input);
    }
  }

  private async _serviceWorkerStdinHandler(request: IStdinRequest): Promise<IStdinReply> {
    if (this._serviceWorkerMainIO !== undefined) {
      return await this._serviceWorkerMainIO.stdinHandler(request);
    } else {
      // Should never be called if _serviceWorkerMainIO does not exist.
      throw new Error('No serviceWorkerStdinHandler exists');
    }
  }

  private _setMainIO(shortName: string): void {
    if (shortName === 'sab' && this._sharedArrayBufferMainIO !== undefined) {
      this._mainIO = this._sharedArrayBufferMainIO;
    } else if (shortName === 'sw' && this._serviceWorkerMainIO !== undefined) {
      this._mainIO = this._serviceWorkerMainIO;
    } else {
      throw new Error(`Cannot set MainIO to '${shortName}'`);
    }
  }

  private _disposed = new Signal<this, void>(this);
  private _isDisposed = false;
  private _ready = new PromiseDelegate<void>();

  private _shellId: string; // Unique identifier within a single browser tab.
  private _worker?: Worker;
  private _remote?: IRemoteShell;

  private _serviceWorkerMainIO?: ServiceWorkerMainIO;
  private _sharedArrayBufferMainIO?: SharedArrayBufferMainIO;
  private _mainIO?: IMainIO;

  private _downloadTracker?: DownloadTracker;
}
