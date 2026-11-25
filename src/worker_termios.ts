import { Termios } from './termios';

/**
 * Termios used in the web worker, which notifies the main UI thread of every change so that the
 * line discipline there uses the same flags.
 */
export class WorkerTermios extends Termios.Termios {
  registerChangedCallback(callback: (flags: Termios.IFlags) => void): void {
    this._changedCallback = callback;
  }

  override set(flags: Termios.IFlags): void {
    super.set(flags);
    this._changed();
  }

  override setDefault(): void {
    super.setDefault();
    this._changed();
  }

  override setRawMode(): void {
    super.setRawMode();
    this._changed();
  }

  // This is called by the base class constructor, which is harmless as there is no callback yet.
  private _changed(): void {
    this._changedCallback?.(this.get());
  }

  private _changedCallback?: (flags: Termios.IFlags) => void;
}
