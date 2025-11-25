import { PromiseDelegate } from '@lumino/coreutils';
import type { IMainIO } from './defs';
import type { IOutputCallback } from '../callback';
import { delay } from '../utils';

export abstract class MainIO implements IMainIO {
  constructor() {}

  async disable(): Promise<void> {
    if (!this._enabled) {
      return;
    }

    // Send all remaining buffered characters as soon as possible via the supplied sendStdinNow.
    for (const ch of this._readBuffer) {
      this._sendStdinNow!(ch);
    }
    this._readBuffer = '';

    if (this._stdinPromise !== undefined) {
      this._stdinPromise.reject('stdin no longer required');
      this._stdinPromise = undefined;
    }

    this._enabled = false;
  }

  dispose(): void {
    if (this._isDisposed) {
      return;
    }

    this._isDisposed = true;
  }

  async enable(): Promise<void> {
    this._enabled = true;
  }

  get enabled(): boolean {
    return this._enabled;
  }

  get isDisposed(): boolean {
    return this._isDisposed;
  }

  async push(chars: string): Promise<void> {
    if (!this._enabled) {
      throw new Error('MainIO.push when disabled');
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

  registerSendStdinNow(sendStdinNow: IOutputCallback): void {
    this._sendStdinNow = sendStdinNow;
  }

  protected async _handleStdinImpl(timeoutMs: number): Promise<string> {
    if (this._stdinPromise !== undefined) {
      console.error('MainIO stdin promise should not exist');
    }

    if (this._readBuffer.length > 0) {
      // Have stored input, so return it straight away.
      const chars = this._readBuffer;
      this._readBuffer = '';
      return chars;
    } else if (timeoutMs === 0) {
      // No timeout so return straight away.
      return '';
    }

    // Store stdinPromise so that it can be resolved by next push() call.
    const stdinPromise = new PromiseDelegate<string>();

    // Negative timeoutMs means wait forever (infinite timeout).
    if (timeoutMs > 0) {
      delay(timeoutMs).then(() => {
        stdinPromise.resolve('');
      });
    }

    this._stdinPromise = stdinPromise;
    const chars = await stdinPromise.promise;
    this._stdinPromise = undefined;
    return chars;
  }

  protected _enabled: boolean = false;
  protected _readBuffer: string = '';
  protected _sendStdinNow?: IOutputCallback;

  private _isDisposed: boolean = false;
  private _stdinPromise?: PromiseDelegate<string>;
}
