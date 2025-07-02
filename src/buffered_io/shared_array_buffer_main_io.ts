import { IMainIO } from './defs';
import { MainIO } from './main';
import { SAB } from './sab';

/**
 * Main worker buffers characters locally, and stores just one character at a time in the
 * SharedArrayBuffer so that the web worker can read it.
 */
export class SharedArrayBufferMainIO extends MainIO implements IMainIO {
  constructor() {
    super();
    const bytesPerElement = Int32Array.BYTES_PER_ELEMENT;
    const readLength = SAB.maxChars + 3;
    this._sharedArrayBuffer = new SharedArrayBuffer(readLength * bytesPerElement);
    this._intArray = new Int32Array(this._sharedArrayBuffer, 0, readLength);
    this._intArray[SAB.MAIN] = 0;
    this._intArray[SAB.WORKER] = 0;
  }

  override async disable(): Promise<void> {
    if (!this._enabled) {
      return;
    }

    // Send all remaining buffered characters as soon as possible via the supplied sendFunction.
    this._disabling = true;
    if (this._readSentCount !== this._readCount) {
      const codes = this._loadFromSharedArrayBuffer();
      let text = '';
      for (const code of codes) {
        text += String.fromCharCode(code);
      }
      this._sendStdinNow!(text);
    }
    while (this._readBuffer.length > 0) {
      this._sendStdinNow!(this._readBuffer.shift()!);
    }

    await super.disable();
    this._disabling = false;
  }

  get sharedArrayBuffer(): SharedArrayBuffer {
    return this._sharedArrayBuffer;
  }

  /**
   * Push a character to the read buffer.
   * It may or may not be stored in the SharedArrayBuffer immediately.
   */
  async push(chars: string) {
    if (!this._enabled) {
      throw new Error('SharedArrayBufferMainIO.push when disabled');
    }

    if (chars.length > SAB.maxChars) {
      // Too big, log this and do not pass it on?
      console.log(`String '${chars}' is too long to buffer`);
    }

    // May be multiple characters if ANSI control sequence.
    this._readBuffer.push(chars);
    this._readBufferCount++;

    if (!this._disabling && this._readCount === this._readSentCount) {
      this._storeInSharedArrayBuffer();
    }
  }

  /**
   * After a successful read by the worker, main checks if another character can be stored in the
   * SharedArrayBuffer.
   */
  private _afterRead() {
    this._readCount = Atomics.load(this._intArray, 1);
    if (this._readCount !== this._readSentCount) {
      // This can occur if buffered read disabled before the afterRead acknowledgement is received.
      return;
    }

    if (this._readBufferCount > this._readSentCount) {
      this._storeInSharedArrayBuffer();
    }
  }

  protected _clear() {
    this._intArray[SAB.MAIN] = 0;
    this._intArray[SAB.WORKER] = 0;
    this._readCount = 0;

    this._readBuffer = [];
    this._readBufferCount = 0;
    this._readSentCount = 0;
  }

  /**
   * Load the character from the shared array buffer and return it.
   */
  private _loadFromSharedArrayBuffer(): number[] {
    const len = Atomics.load(this._intArray, SAB.LENGTH);
    const ret: number[] = [];
    for (let i = 0; i < len; i++) {
      ret.push(Atomics.load(this._intArray, SAB.START + i));
    }
    return ret;
  }

  private _storeInSharedArrayBuffer() {
    const char: string = this._readBuffer.shift()!;
    this._readSentCount++;

    // Store character in SharedArrayBuffer.
    const len = char.length;
    Atomics.store(this._intArray, SAB.LENGTH, len);
    for (let i = 0; i < len; i++) {
      Atomics.store(this._intArray, SAB.START + i, char.charCodeAt(i));
    }

    // Notify web worker that a new character is available.
    Atomics.store(this._intArray, SAB.MAIN, this._readSentCount);
    Atomics.notify(this._intArray, SAB.MAIN, 1);

    // Async wait for web worker to read this character.
    const { async, value } = Atomics.waitAsync(this._intArray, SAB.WORKER, this._readCount);
    if (async) {
      value.then(() => this._afterRead());
    } else {
      this._afterRead();
    }
  }

  private _disabling: boolean = false;
  private _intArray: Int32Array;
  private _readBuffer: string[] = [];
  private _readBufferCount: number = 0;
  private _readCount: number = 0;
  private _readSentCount: number = 0;
  private _sharedArrayBuffer: SharedArrayBuffer;
}
