import type { IDisposable } from '@lumino/disposable';
import { ansi } from './ansi';
import { IOutputCallback } from './callback';

export class DownloadTracker implements IDisposable {
  constructor(
    readonly packageName: string,
    readonly moduleName: string,
    readonly outputCallback: IOutputCallback
  ) {}

  dispose() {
    if (this._isDisposed) {
      return;
    }

    this.stop();
    this._isDisposed = true;
  }

  get isDisposed(): boolean {
    return this._isDisposed;
  }

  start() {
    if (this._intervalId !== undefined) {
      this.stop();
    }

    this._intervalId = setInterval(this._callback.bind(this), this._delayMs);
  }

  stop() {
    if (this._intervalId !== undefined) {
      clearTimeout(this._intervalId);
      this._intervalId = undefined;
      this._callbackCount = 0;

      if (this._displayed) {
        this.outputCallback(ansi.eraseEndLine + ansi.showCursor);
      }
      this._displayed = false;
    }
  }

  private _callback() {
    if (this._callbackCount < this._initialIgnore) {
      // Do nothing yet
    } else if (!this._displayed) {
      // Start displaying download message
      const message = ` downloading wasm module '${this.moduleName}'`;
      const n = message.length;
      this.outputCallback(ansi.hideCursor + this._dots[0] + message + ansi.cursorLeft(n + 1));
      this._displayed = true;
    } else {
      // Update the rotating dots
      const dots = this._dots[(this._callbackCount - this._initialIgnore) % this._dots.length];
      this.outputCallback(dots + ansi.cursorLeft(1));
    }

    this._callbackCount++;
  }

  private _callbackCount = 0;
  private _delayMs = 100;
  private _dots = '⠇⠋⠙⠸⠴⠦';
  private _initialIgnore = 3; // Number of callbacks to ignore before displaying message
  private _intervalId?: any;
  private _isDisposed = false;
  private _displayed = false;
}
