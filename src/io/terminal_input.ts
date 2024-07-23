import { IInput } from './input';
import { IStdinCallback } from '../callback';

export class TerminalInput implements IInput {
  constructor(readonly stdinCallback?: IStdinCallback) {}

  readChar(): number[] {
    if (this._finished || this.stdinCallback === undefined) {
      return [4]; // EOT
    } else {
      // What to do if more than one character?
      const utf16 = this.stdinCallback();
      if (utf16[0] === 4) {
        this._finished = true;
      } else if (utf16[0] === 13) {
        return [10];
      }
      return utf16;
    }
  }

  private _finished = false;
}
