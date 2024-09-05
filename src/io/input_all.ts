import { IInput } from './input';

export abstract class InputAll implements IInput {
  isTerminal(): boolean {
    return false;
  }

  /**
   * Read and return the entire contents of this input. No special character is required to indicate
   * the end of the input, it is just the end of the string. Should only be called once per object.
   */
  abstract readAll(): string;

  readChar(): number[] {
    if (this._buffer === undefined) {
      this._buffer = this.readAll();
      this._index = 0;
    }

    if (this._index < this._buffer.length) {
      const char = this._buffer[this._index++];
      const ret: number[] = [];
      for (let i = 0; i < char.length; i++) {
        ret.push(char.charCodeAt(i));
      }
      return ret;
    } else {
      return [4]; // EOT
    }
  }

  private _buffer?: string;
  private _index: number = 0;
}
