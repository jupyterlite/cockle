import { stringFromCharCodes } from '../../utils';

const HIGH_SURROGATE_MIN = 0xd800;
const HIGH_SURROGATE_MAX = 0xdbff;

const textEncoder = new TextEncoder();

/**
 * Buffer which converts UTF-16 characters into the UTF-8 bytes of a wasm command input stream.
 * A character may produce multiple UTF-8 bytes, and a code unit may be one half of a surrogate
 * pair split between reads, so pending bytes and characters are retained between reads.
 *
 * Characters are encoded with TextEncoder into a staging buffer which is reused between reads.
 */
export class Utf8InputBuffer {
  /**
   * Read characters using the supplied function until at least one byte is available, or the
   * input is exhausted.
   * @param readChars Function to read up to maxChars characters from the input.
   * @param maxChars Maximum characters to request per read.
   */
  fill(readChars: (maxChars: number) => number[], maxChars: number): void {
    while (this._index === this._end) {
      const chars: number[] = readChars(maxChars);
      if (chars.length === 0) {
        // End of input: a retained high surrogate is invalid on its own.
        this._flushPendingHighSurrogate();
        return;
      }
      this._push(chars);
    }
  }

  /**
   * @returns The next byte, or null if none is available.
   */
  readByte(): number | null {
    return this._index < this._end ? this._bytes[this._index++] : null;
  }

  /**
   * Remove and return up to maxBytes bytes as a view into the buffer, valid until the next call
   * to fill().
   * @param maxBytes Maximum number of bytes to take from the buffer.
   * @returns A view into the buffer containing up to maxBytes bytes.
   */
  take(maxBytes: number): Uint8Array {
    const end: number = Math.min(this._index + maxBytes, this._end);
    const bytes: Uint8Array = this._bytes.subarray(this._index, end);
    this._index = end;
    return bytes;
  }

  /**
   * @returns The number of bytes currently available in the buffer.
   */
  get length(): number {
    return this._end - this._index;
  }

  /**
   * Add characters read from the input. Only called when the buffer is empty.
   * @param chars Characters to add to the buffer.
   */
  private _push(chars: number[]): void {
    if (this._pendingHighSurrogate !== undefined) {
      chars = [this._pendingHighSurrogate, ...chars];
      this._pendingHighSurrogate = undefined;
    }

    const last: number | undefined = chars.at(-1);
    if (last !== undefined && last >= HIGH_SURROGATE_MIN && last <= HIGH_SURROGATE_MAX) {
      // Trailing high surrogate: retain it to join with the next character.
      this._pendingHighSurrogate = last;
      chars = chars.slice(0, -1);
    }

    this._encode(chars);
  }

  /**
   * Encode a retained high surrogate from an incomplete surrogate pair as the Unicode replacement
   * character.
   */
  private _flushPendingHighSurrogate(): void {
    if (this._pendingHighSurrogate !== undefined) {
      this._encode([this._pendingHighSurrogate]);
      this._pendingHighSurrogate = undefined;
    }
  }

  /**
   * Encode characters into the beginning of the staging buffer.
   * @param chars Characters to encode.
   */
  private _encode(chars: number[]): void {
    const text: string = stringFromCharCodes(chars);
    // A code unit produces up to 3 bytes (a surrogate pair produces 4 bytes for 2 code units),
    // so this capacity always has room for all of the encoded text.
    const capacity: number = 3 * text.length;
    if (this._bytes.length < capacity) {
      this._bytes = new Uint8Array(capacity);
    }
    this._end = textEncoder.encodeInto(text, this._bytes).written;
    this._index = 0;
  }

  private _bytes: Uint8Array = new Uint8Array(0);
  private _end: number = 0;
  private _index: number = 0;
  private _pendingHighSurrogate?: number;
}
