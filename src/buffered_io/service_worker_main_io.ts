import { PromiseDelegate } from '@lumino/coreutils';

import { IMainIO, IStdinReply, IStdinRequest } from './defs';
import { MainIO } from './main';
import { ServiceWorkerUtils } from './service_worker_utils';

export class ServiceWorkerMainIO extends MainIO implements IMainIO {
  constructor(baseUrl: string, browsingContextId: string, shellId: string) {
    super();
    this._utils = new ServiceWorkerUtils(baseUrl, browsingContextId, shellId);
  }

  override async disable(): Promise<void> {
    // Send all remaining buffered characters as soon as possible via the supplied sendFunction.
    for (const ch of this._readBuffer) {
      this._sendStdinNow!(ch);
    }
    this._readBuffer = '';

    await super.disable();
  }

  async push(chars: string): Promise<void> {
    if (!this._enabled) {
      throw new Error('ServiceWorkerMainIO.push when disabled');
    }

    if (this._stdinPromise !== undefined) {
      // If promise pending, resolve it.
      this._stdinPromise.resolve(chars);
      this._stdinPromise = undefined;
    } else {
      // Otherwise store it for the next stdin request.
      this._readBuffer += chars;
    }
  }

  protected _clear(): void {
    if (this._stdinPromise !== undefined) {
      this._stdinPromise.reject('stdin no longer required');
      this._stdinPromise = undefined;
    }
    this._readBuffer = '';
  }

  async handleStdin(request: IStdinRequest): Promise<IStdinReply> {
    if (!this._enabled) {
      throw new Error('ServiceWorkerMainIO.handleStdin when disabled');
    }

    const { test, timeoutMs } = request;

    if (test) {
      return { text: 'ok:' + request.shellId };
    }

    if (this._readBuffer.length > 0) {
      // Send buffered data immediately
      const text = this._readBuffer;
      this._readBuffer = '';
      return { text };
    }

    const stdinPromise = new PromiseDelegate<string | null>();

    if (timeoutMs > 0) {
      const timeoutPromise = new Promise<null>(resolve => {
        setTimeout(() => resolve(null), timeoutMs);
      });
      timeoutPromise.then(() => {
        stdinPromise.resolve(null);
      });
    }

    // Store stdinPromise so that it can be resolved by next push() call.
    this._stdinPromise = stdinPromise;

    const text = await stdinPromise.promise;
    return { text };
  }

  async testWithTimeout(timeoutMs: number): Promise<boolean> {
    if (!this._enabled) {
      throw new Error('ServiceWorkerMainIO.testWithTimeout when disabled');
    }

    const testPromise = this._utils.getStdinAsync(0, true);
    const timeoutPromise = new Promise<null>(resolve => {
      return setTimeout(() => resolve(null), timeoutMs);
    });

    const text = await Promise.race([testPromise, timeoutPromise]);
    if (text === null) {
      console.warn('Timeout accessing service worker');
      return false;
    } else if (text !== 'ok:' + this._utils.shellId) {
      console.warn('Error accessing service worker');
      return false;
    }
    return true;
  }

  private _readBuffer: string = '';
  private _stdinPromise?: PromiseDelegate<string | null>;
  private _utils: ServiceWorkerUtils;
}
