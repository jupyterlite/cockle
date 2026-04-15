import type { IInput } from './input';

export abstract class InputAll implements IInput {
  isTerminal(): boolean {
    return false;
  }

  poll(timeoutMs: number): boolean {
    // Ignore timeout as all content is already available.
    return this._index < this.buffer.length;
  }

  /**
   * Read and return the entire contents of this input. No special character is required to indicate
   * the end of the input, it is just the end of the string. Should only be called once per object.
   */
  abstract readAll(): string;

  async readAsync(maxChars: number | null): Promise<number[]> {
    return this.read(maxChars);
  }

  read(maxChars: number | null): number[] {
    const { buffer } = this;

    if (this._index < buffer.length) {
      const char = buffer[this._index++];
      const ret: number[] = [];
      for (let i = 0; i < char.length; i++) {
        ret.push(char.charCodeAt(i));
      }
      return ret;
    } else {
      return [];
    }
  }

  private get buffer(): string {
    if (this._buffer === undefined) {
      this._buffer = this.readAll();
      this._index = 0;
    }
    return this._buffer;
  }

  private _buffer?: string;
  private _index: number = 0;
}
