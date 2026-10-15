import { utf8BytesFromCharCodes } from '../../utils';

/**
 * Buffer which converts UTF-16 characters into the UTF-8 bytes of a wasm command input stream.
 * A character may produce multiple UTF-8 bytes, and a code unit may be one half of a surrogate
 * pair split between reads, so pending bytes and characters are retained between reads.
 */
export class Utf8InputBuffer {
  /**
   * Read characters using the supplied function until at least one byte is available, or the
   * input is exhausted.
   * @param readChars Function to read up to maxChars characters from the input.
   * @param maxChars Maximum characters to request per read.
   */
  fill(readChars: (maxChars: number) => number[], maxChars: number): void {
    while (this._index === this._bytes.length) {
      const chars = readChars(maxChars);
      if (chars.length === 0) {
        // End of input: a retained high surrogate is invalid on its own.
        this._flushPendingHighSurrogate();
        return;
      }
      this._push(chars);
    }
  }

  /**
   * Remove and return the next byte, or null if none is available.
   */
  readByte(): number | null {
    return this._index < this._bytes.length ? this._bytes[this._index++] : null;
  }

  /**
   * Remove and return up to maxBytes bytes as a view into the buffer.
   */
  take(maxBytes: number): Uint8Array {
    const end = Math.min(this._index + maxBytes, this._bytes.length);
    const bytes = this._bytes.subarray(this._index, end);
    this._index = end;
    return bytes;
  }

  get length(): number {
    return this._bytes.length - this._index;
  }

  /**
   * Add characters read from the input. Only called when the buffer is empty.
   */
  private _push(chars: number[]): void {
    if (this._pendingHighSurrogate !== undefined) {
      chars = [this._pendingHighSurrogate, ...chars];
      this._pendingHighSurrogate = undefined;
    }

    const last = chars.at(-1)!;
    if (last >= 0xd800 && last <= 0xdbff) {
      // Trailing high surrogate: retain it to join with the next character.
      this._pendingHighSurrogate = last;
      chars = chars.slice(0, -1);
    }

    this._bytes = utf8BytesFromCharCodes(chars);
    this._index = 0;
  }

  /**
   * Encode a retained high surrogate from an incomplete surrogate pair as the Unicode replacement
   * character.
   */
  private _flushPendingHighSurrogate(): void {
    if (this._pendingHighSurrogate !== undefined) {
      this._bytes = utf8BytesFromCharCodes([this._pendingHighSurrogate]);
      this._index = 0;
      this._pendingHighSurrogate = undefined;
    }
  }

  private _bytes: Uint8Array = new Uint8Array(0);
  private _index = 0;
  private _pendingHighSurrogate?: number;
}
