import { IMainIO } from './defs';
import { IOutputCallback } from '../callback';

export abstract class MainIO implements IMainIO {
  constructor() {}

  async disable(): Promise<void> {
    this._enabled = false;
    this._clear();
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

  registerSendStdinNow(sendStdinNow: IOutputCallback): void {
    this._sendStdinNow = sendStdinNow;
  }

  protected abstract _clear(): void;

  protected _disabling: boolean = false;
  private _enabled: boolean = false;
  private _isDisposed: boolean = false;
  protected _sendStdinNow?: IOutputCallback;
}
