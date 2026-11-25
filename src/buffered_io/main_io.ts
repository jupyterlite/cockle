import { PromiseDelegate } from '@lumino/coreutils';
import type { IMainIO, IPosixSignal, StdinResult } from './defs';
import type { IOutputCallback, ISize } from '../callback';
import { PosixSignal } from '../posix_signal';
import { delay } from '../utils';

export abstract class MainIO implements IMainIO {
  constructor() {}

  async disable(): Promise<void> {
    if (!this._enabled) {
      return;
    }

    // Send all remaining buffered characters as soon as possible via the supplied sendStdinNow.
    for (const chars of this._queue) {
      if (chars !== null) {
        this._sendStdinNow!(chars);
      }
    }
    this._queue = [];

    // Discard any queued signals as they were intended for the command that has finished.
    this._signalBuffer = [];

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

  async sendPosixSignal(signal: PosixSignal, args?: ISize): Promise<void> {
    if (!this._enabled) {
      throw new Error('MainIO.sendPosixSignal when disabled');
    }

    const item: IPosixSignal = { signal, args };
    if (this._stdinPromise !== undefined) {
      // If promise pending, resolve it.
      this._stdinPromise.resolve([item]);
      this._stdinPromise = undefined;
    } else if (signal === PosixSignal.SIGWINCH) {
      // Only store a single SIGWINCH, replacing any existing one so that it has the latest size.
      const index = this._signalBuffer.findIndex(s => s.signal === PosixSignal.SIGWINCH);
      if (index >= 0) {
        this._signalBuffer[index] = item;
      } else {
        this._signalBuffer.push(item);
      }
    } else {
      // Otherwise store it for the next stdin request.
      this._signalBuffer.push(item);
    }
  }

  async push(chars: string): Promise<void> {
    if (!this._enabled) {
      throw new Error('MainIO.push when disabled');
    }

    // An empty string is end-of-file.
    const entry = chars === '' ? null : chars;
    if (this._stdinPromise !== undefined) {
      // If promise pending, resolve it.
      this._stdinPromise.resolve(entry);
      this._stdinPromise = undefined;
    } else {
      // Otherwise store it for the next stdin request.
      this._queue.push(entry);
    }
  }

  registerSendStdinNow(sendStdinNow: IOutputCallback): void {
    this._sendStdinNow = sendStdinNow;
  }

  protected async _handleStdinImpl(timeoutMs: number): Promise<StdinResult> {
    if (this._stdinPromise !== undefined) {
      console.error('MainIO stdin promise should not exist');
    }

    if (this._signalBuffer.length > 0) {
      // Have stored signals, which take priority over text, so return them straight away.
      const signals = this._signalBuffer;
      this._signalBuffer = [];
      return signals;
    } else if (this._queue.length > 0) {
      // Have stored input, so return the first of it straight away.
      return this._queue.shift() as StdinResult;
    } else if (timeoutMs === 0) {
      // No timeout so return straight away.
      return '';
    }

    // Store stdinPromise so that it can be resolved by next push() or sendPosixSignal() call.
    const stdinPromise = new PromiseDelegate<StdinResult>();

    // Negative timeoutMs means wait forever (infinite timeout).
    if (timeoutMs > 0) {
      delay(timeoutMs).then(() => {
        stdinPromise.resolve('');
      });
    }

    this._stdinPromise = stdinPromise;
    const result = await stdinPromise.promise;
    this._stdinPromise = undefined;
    return result;
  }

  protected _enabled: boolean = false;
  protected _sendStdinNow?: IOutputCallback;

  private _isDisposed: boolean = false;
  private _queue: (string | null)[] = []; // null is end-of-file
  private _signalBuffer: IPosixSignal[] = [];
  private _stdinPromise?: PromiseDelegate<StdinResult>;
}
