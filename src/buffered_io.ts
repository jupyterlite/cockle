import { IOutputCallback } from './callback';
import { InputFlag, LocalFlag, OutputFlag, ITermios, Termios } from './termios';

/**
 * Classes for buffered input between main worker and web worker. Both have access to the same
 * SharedArrayBuffer and use that to pass stdin characters from the UI (main worker) to the shell
 * (webworker). This is necessary when the shell is running a WASM command that is synchronous and
 * blocking, as the usual async message passing from main to webworker does not work as the received
 * messages would only be processed when the command has finished.
 *
 * Reading (from main worker to web worker) is explicitly enabled/disabled.
 */

// Indexes into Int32Arrays.
const READ_MAIN = 0;
const READ_WORKER = 1;
const READ_LENGTH = 2;
const READ_START = 3;

abstract class BufferedIO {
  constructor(sharedArrayBuffer?: SharedArrayBuffer) {
    const bytesPerElement = Int32Array.BYTES_PER_ELEMENT;
    const readLength = this._maxReadChars + 3;

    if (sharedArrayBuffer === undefined) {
      this._sharedArrayBuffer = new SharedArrayBuffer(readLength * bytesPerElement);
    } else {
      this._sharedArrayBuffer = sharedArrayBuffer;
    }

    this._readArray = new Int32Array(this._sharedArrayBuffer, 0, readLength);
    if (sharedArrayBuffer === undefined) {
      this._readArray[READ_MAIN] = 0;
      this._readArray[READ_WORKER] = 0;
    }
  }

  async disable(): Promise<void> {
    this._enabled = false;
    this._clear();
  }

  async enable(): Promise<void> {
    this._enabled = true;
  }

  get enabled(): boolean {
    return this._enabled;
  }

  utf8ArrayToString(chars: Int8Array): string {
    if (this._utf8Decoder === undefined) {
      this._utf8Decoder = new TextDecoder('utf8');
    }
    return this._utf8Decoder.decode(chars);
  }

  protected _clear() {
    this._readArray[READ_MAIN] = 0;
    this._readArray[READ_WORKER] = 0;
    this._readCount = 0;
  }

  /**
   * Load the character from the shared array buffer and return it.
   */
  protected _loadFromSharedArrayBuffer(): number[] {
    const len = Atomics.load(this._readArray, READ_LENGTH);
    const ret: number[] = [];
    for (let i = 0; i < len; i++) {
      ret.push(Atomics.load(this._readArray, READ_START + i));
    }
    return ret;
  }

  protected _enabled: boolean = false;
  protected _sharedArrayBuffer: SharedArrayBuffer;

  protected _maxReadChars: number = 64; // Max number of actual characters in a token.
  protected _readArray: Int32Array;
  protected _readCount: number = 0;

  private _utf8Decoder?: TextDecoder;
}

export namespace MainBufferedIO {
  export interface ISendStdinNow {
    (output: string): Promise<void>;
  }
}

/**
 * Main worker buffers characters locally, and stores just one character at a time in the
 * SharedArrayBuffer so that the web worker can read it.
 */
export class MainBufferedIO extends BufferedIO {
  constructor(readonly outputCallback: IOutputCallback) {
    super();
  }

  override async disable(): Promise<void> {
    // Send all remaining buffered characters as soon as possible via the supplied sendFunction.
    this._disabling = true;
    if (this._readSentCount !== this._readCount) {
      const codes = this._loadFromSharedArrayBuffer();
      let text = '';
      for (const code of codes) {
        text += String.fromCharCode(code);
      }
      await this._sendStdinNow!(text);
    }
    while (this._readBuffer.length > 0) {
      await this._sendStdinNow!(this._readBuffer.shift()!);
    }
    this._disabling = false;

    super.disable();
  }

  dispose(): void {
    if (this._isDisposed) {
      return;
    }

    this._isDisposed = true;
  }

  get sharedArrayBuffer(): SharedArrayBuffer {
    return this._sharedArrayBuffer;
  }

  /**
   * Push a character to the read buffer.
   * It may or may not be stored in the SharedArrayBuffer immediately.
   */
  async push(char: string) {
    // May be multiple characters if ANSI control sequence.
    this._readBuffer.push(char);
    this._readBufferCount++;

    if (char.length > this._maxReadChars) {
      // Too big, log this and do not pass it on?
      console.log(`String '${char}' is too long to buffer`);
    }

    if (!this._disabling && this._readCount === this._readSentCount) {
      this._storeInSharedArrayBuffer();
    }
  }

  registerSendStdinNow(sendStdinNow: MainBufferedIO.ISendStdinNow) {
    this._sendStdinNow = sendStdinNow;
  }

  async start(): Promise<void> {}

  /**
   * After a successful read by the worker, main checks if another character can be stored in the
   * SharedArrayBuffer.
   */
  private _afterRead() {
    this._readCount = Atomics.load(this._readArray, 1);
    if (this._readCount !== this._readSentCount) {
      throw new Error('Should not happen');
    }

    if (this._readBufferCount > this._readSentCount) {
      this._storeInSharedArrayBuffer();
    }
  }

  protected override _clear() {
    super._clear();
    this._readBuffer = [];
    this._readBufferCount = 0;
    this._readSentCount = 0;
  }

  private _storeInSharedArrayBuffer() {
    const char: string = this._readBuffer.shift()!;
    this._readSentCount++;

    // Store character in SharedArrayBuffer.
    const len = char.length;
    Atomics.store(this._readArray, READ_LENGTH, len);
    for (let i = 0; i < len; i++) {
      Atomics.store(this._readArray, READ_START + i, char.charCodeAt(i));
    }

    // Notify web worker that a new character is available.
    Atomics.store(this._readArray, READ_MAIN, this._readSentCount);
    Atomics.notify(this._readArray, READ_MAIN, 1);

    // Async wait for web worker to read this character.
    const { async, value } = Atomics.waitAsync(this._readArray, READ_WORKER, this._readCount);
    if (async) {
      value.then(() => this._afterRead());
    } else {
      this._afterRead();
    }
  }

  private _isDisposed: boolean = false;
  private _disabling: boolean = false;
  private _readBuffer: string[] = [];
  private _readBufferCount: number = 0;
  private _readSentCount: number = 0;
  private _sendStdinNow?: MainBufferedIO.ISendStdinNow;
}

export class WorkerBufferedIO extends BufferedIO {
  constructor(sharedArrayBuffer: SharedArrayBuffer, readonly outputCallback: IOutputCallback) {
    super(sharedArrayBuffer);
  }

  allowAdjacentNewline(set: boolean) {
    this._allowAdjacentNewline = set;
  }

  /**
   * Poll for whether readable (there is input ready to read) and/or writable.
   * Currently assumes always writable.
   */
  poll(timeoutMs: number): number {
    // Constants.
    const POLLIN = 1;
    const POLLOUT = 4;

    const writable = true;

    if (this._readBuffer.length > 0) {
      return POLLIN | (writable ? POLLOUT : 0);
    }

    const t = timeoutMs > 0 ? timeoutMs : 0;
    const readableCheck = Atomics.wait(this._readArray, READ_MAIN, this._readCount, t);
    const readable = readableCheck === 'not-equal';
    return (readable ? POLLIN : 0) | (writable ? POLLOUT : 0);
  }

  read(maxChars: number | null): number[] {
    if (maxChars !== null && maxChars <= 0) {
      return [];
    }

    if (this._readBuffer.length > 0) {
      // If have cached read data just return that.
      return this._readFronBuffer(maxChars);
    }

    Atomics.wait(this._readArray, READ_MAIN, this._readCount);

    const readCount = Atomics.load(this._readArray, READ_MAIN);
    if (readCount === this._readCount) {
      return [];
    }

    const read = this._loadFromSharedArrayBuffer();
    this._readCount++;

    // Notify main worker that character has been read and a new one can be stored.
    Atomics.store(this._readArray, READ_WORKER, this._readCount);
    Atomics.notify(this._readArray, READ_WORKER, 1);

    this._readBuffer = this._processReadChars(read);
    this._maybeEchoToOutput(this._readBuffer);
    return this._readFronBuffer(maxChars);
  }

  get termios(): Termios {
    return this._termios;
  }

  setTermios(iTermios: ITermios): void {
    this.termios.set(iTermios);
    this._writeColumn = 0;
  }

  write(text: string | Int8Array | number[]): void {
    let chars: number[] = [];
    if (typeof text === 'string') {
      chars = this._processWriteChars(text.split('').map(ch => ch.charCodeAt(0)));
    } else {
      chars = this._processWriteChars(text);
    }

    this.outputCallback(String.fromCharCode(...chars));
  }

  _maybeEchoToOutput(chars: number[]): void {
    const NL = 10; // Linefeed \n
    const echo = (this.termios.c_lflag & LocalFlag.ECHO) > 0;
    const echoNL = (this.termios.c_lflag & LocalFlag.ECHONL) > 0;
    if (!echo && !echoNL) {
      return;
    }

    const ret: number[] = [];
    for (const char of chars) {
      switch (char) {
        case NL:
          ret.push(NL);
          break;
        case 4:
          break;
        default:
          if (echo) {
            ret.push(char);
          }
          break;
      }
    }

    if (ret.length > 0) {
      this.write(ret);
    }
  }

  private _processReadChars(chars: number[]): number[] {
    const NL = 10; // Linefeed \n
    const CR = 13; // Carriage return \r

    const ret: number[] = [];
    for (const char of chars) {
      switch (char) {
        case CR:
          if ((this.termios.c_iflag & InputFlag.IGNCR) === 0) {
            if ((this.termios.c_iflag & InputFlag.ICRNL) > 0) {
              ret.push(NL);
            } else {
              ret.push(CR);
            }
          }
          break;
        case NL:
          if ((this.termios.c_iflag & InputFlag.INLCR) > 0) {
            ret.push(CR);
          } else {
            ret.push(NL);
          }
          break;
        default:
          ret.push(char);
          break;
      }
    }
    return ret;
  }

  private _processWriteChars(chars: Int8Array | number[]): number[] {
    const NL = 10; // Linefeed \n
    const CR = 13; // Carriage return \r

    let inEscape = false;
    let startEscape = 0;
    const ret: number[] = [];
    for (let i = 0; i < chars.length; i++) {
      const char = chars[i];

      if (!inEscape && char === 27) {
        inEscape = true;
        startEscape = i;
      }

      switch (char) {
        case NL:
          if (this._writeColumn === 0 && !this._allowAdjacentNewline) {
            break;
          }
          this._writeColumn = 0;
          if ((this.termios.c_oflag & OutputFlag.ONLCR) > 0) {
            ret.push(CR, NL);
          } else {
            ret.push(NL);
          }
          break;
        default:
          if (!inEscape && char >= 32) {
            this._writeColumn++;
          }
          ret.push(char);
          break;
      }

      if (
        inEscape &&
        i > startEscape + 2 &&
        ((char >= 65 && char <= 90) || (char >= 97 && char <= 122))
      ) {
        // Crude identification of end of ansi escape sequence.
        inEscape = false;
      }
    }

    return ret;
  }

  /**
   * Extract and return up to maxChars from _readBuffer, or all characters if maxChars is null,
   * leaving the remainder in the buffer.
   * _readBuffer may or may not be empty when this is called.
   */
  private _readFronBuffer(maxChars: number | null): number[] {
    if (maxChars === null) {
      const ret = this._readBuffer;
      this._readBuffer = [];
      return ret;
    } else {
      const ret = this._readBuffer.slice(0, maxChars);
      this._readBuffer.splice(0, ret.length); // ret.length may be < maxChars
      return ret;
    }
  }

  private _termios: Termios = Termios.newDefaultWasm();
  private _allowAdjacentNewline = false;
  private _writeColumn = 0;
  private _readBuffer: number[] = [];
}
