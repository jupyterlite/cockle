import type { IOutputCallback } from '@jupyterlite/cockle';
import { PromiseDelegate } from '@lumino/coreutils';

/**
 * Provides outputCallback to mock a terminal.
 */
export class MockTerminalOutput {
  constructor(start: boolean = true) {
    this._started = start;
  }

  callback: IOutputCallback = (output: string) => {
    if (this._started) {
      this._text = this._text + output;
      if (this._containsPromise !== undefined && this._text.includes(this._containsText)) {
        this._containsPromise.resolve(void 0);
      }
    }
  };

  clear() {
    this._text = '';
  }

  // Return a promise which resolves when the output contains the specified text.
  async contains(text: string): Promise<void> {
    if (this._containsPromise !== undefined) {
      this._containsPromise.reject(void 0);
    }
    this._containsPromise = new PromiseDelegate<void>();
    this._containsText = text;
    return this._containsPromise.promise;
  }

  start() {
    this._started = true;
  }

  get text(): string {
    return this._text;
  }

  textAndClear(): string {
    const ret = this.text;
    this.clear();
    return ret;
  }

  private _containsPromise?: PromiseDelegate<void>;
  private _containsText = '';
  private _started: boolean;
  private _text: string = '';
}
