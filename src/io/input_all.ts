import type { IInput } from './input';

export abstract class InputAll implements IInput {
  get finished(): boolean {
    return this._index >= this.buffer.length;
  }

  isTerminal(): boolean {
    return false;
  }

  poll(timeoutMs: number): boolean {
    // Ignore timeout as all content is already available.
    return !this.finished;
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
    if (maxChars !== null && maxChars <= 0) {
      return [];
    }

    const { buffer } = this;
    const start = this._index;
    const end = maxChars === null ? buffer.length : Math.min(start + maxChars, buffer.length);
    const n = end - start;
    const ret = new Array<number>(n);
    for (let i = 0; i < n; i++) {
      ret[i] = buffer.charCodeAt(start + i);
    }
    this._index = end;
    return ret;
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
