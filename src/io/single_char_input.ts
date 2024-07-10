import { Input } from "./input"

/**
 * Wrapper for an Input that reads a single character at a time.
 */
export class SingleCharInput {
  constructor(readonly input: Input) {}

  /**
   * Return a single character at a time.  Return ascii 4 (EOT) when nothing more left to read.
   */
  readCharCode(): number {
    if (this._buffer === null) {
      this._buffer = this.input.read()
      this._index = 0
    }

    if (this._index < this._buffer.length) {
      return this._buffer[this._index++].charCodeAt(0)
    } else {
      return 4  // Ascii code for EOT
    }
  }

  private _buffer: string | null = null;
  private _index: number = 0
}
