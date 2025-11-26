import { PromiseDelegate } from '@lumino/coreutils';
import type { IWorkerIO } from './defs';
import { ansi } from '../ansi';
import type { IOutputCallback } from '../callback';
import { Termios } from '../termios';
import { isLetter } from '../utils';

export abstract class WorkerIO implements IWorkerIO {
  constructor(
    readonly outputCallback: IOutputCallback,
    readonly termios: Termios.Termios
  ) {}

  async canEnable(): Promise<void> {
    await this._available?.promise;
  }

  async disable(): Promise<void> {
    if (!this._enabled) {
      return;
    }

    this._enabled = false;
    this._available?.resolve();
  }

  async enable(): Promise<void> {
    this._enabled = true;
    this._available = new PromiseDelegate<void>();
  }

  get enabled(): boolean {
    return this._enabled;
  }

  poll(timeoutMs: number): number {
    if (!this._enabled) {
      throw new Error('WorkerIO.poll when disabled');
    }

    let readable = this._readBuffer.length > 0;
    // Negative timeoutMs means wait forever (infinite timeout).
    if (!readable && timeoutMs !== 0) {
      const chars = this._getStdin(timeoutMs);
      this._postRead(chars);
      // If chars.length > 0 then there are characters to read, so readable is true.
      readable = this._readBuffer.length > 0;
    }

    // Constants.
    const POLLIN = 1;
    const POLLOUT = 4;

    const writable = true;
    return (readable ? POLLIN : 0) | (writable ? POLLOUT : 0);
  }

  read(maxChars: number | null): number[] {
    if (!this._enabled) {
      throw new Error('WorkerIO.read when disabled');
    }

    if (maxChars !== null && maxChars <= 0) {
      return [];
    }

    if (this._readBuffer.length > 0) {
      // If have cached read data just return that.
      return this._readFromBuffer(maxChars);
    }

    const chars = this._getStdin(-1);
    this._postRead(chars);
    return this._readFromBuffer(maxChars);
  }

  async readAsync(maxChars: number | null, timeoutMs: number): Promise<number[]> {
    if (!this._enabled) {
      throw new Error('WorkerIO.readAsync when disabled');
    }

    if (maxChars !== null && maxChars <= 0) {
      return [];
    }

    if (this._readBuffer.length > 0) {
      // If have cached read data just return that.
      return this._readFromBuffer(maxChars);
    }

    // Negative timeoutMs means wait forever (infinite timeout).
    const chars = await this._getStdinAsync(timeoutMs);
    this._postRead(chars);
    return this._readFromBuffer(maxChars);
  }

  utf8ArrayToString(chars: Int8Array): string {
    if (this._utf8Decoder === undefined) {
      this._utf8Decoder = new TextDecoder('utf8');
    }
    return this._utf8Decoder.decode(chars);
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

  protected abstract _getStdin(timeoutMs: number): string;

  protected abstract _getStdinAsync(timeoutMs: number): Promise<string>;

  protected _maybeEchoToOutput(chars: number[]): void {
    const NL = 10; // Linefeed \n
    const termiosFlags = this.termios.get();
    const echo = (termiosFlags.c_lflag & Termios.LocalFlag.ECHO) > 0;
    const echoNL = (termiosFlags.c_lflag & Termios.LocalFlag.ECHONL) > 0;
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

  protected _postRead(chars: string): void {
    const read = chars.split('').map(ch => ch.charCodeAt(0));
    const processed = this._processReadChars(read);
    this._readBuffer.push(...processed);
    this._maybeEchoToOutput(processed);
  }

  protected _processReadChars(chars: number[]): number[] {
    const NL = 10; // Linefeed \n
    const CR = 13; // Carriage return \r
    const termiosFlags = this.termios.get();

    const ret: number[] = [];
    for (const char of chars) {
      switch (char) {
        case CR:
          if ((termiosFlags.c_iflag & Termios.InputFlag.IGNCR) === 0) {
            if ((termiosFlags.c_iflag & Termios.InputFlag.ICRNL) > 0) {
              ret.push(NL);
            } else {
              ret.push(CR);
            }
          }
          break;
        case NL:
          if ((termiosFlags.c_iflag & Termios.InputFlag.INLCR) > 0) {
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

  protected _processWriteChars(chars: Int8Array | number[]): number[] {
    const NL = 10; // Linefeed \n
    const CR = 13; // Carriage return \r
    const termiosFlags = this.termios.get();
    const { c_oflag } = termiosFlags;

    const ret: number[] = [];
    for (let i = 0; i < chars.length; i++) {
      const char = chars[i];

      if (char === 27) {
        // Escape character '\x1B'
        const nextChar = chars.at(i + 1);
        if (nextChar === 91 || nextChar === 93) {
          // '[' or ']'
          // ANSI escape sequence.
          const isOpenBracket = chars[i + 1] === 91;
          const slice = chars.slice(i + 2);
          const index = slice.findIndex(ch =>
            isOpenBracket ? isLetter(ch) : ch === 7 || ch === 27
          );

          if (index >= 0) {
            const sequence = chars.slice(i, i + index + 3);
            ret.push(...sequence);
            i += index + 2;

            const asString = String.fromCharCode(...sequence);

            if (this._inAlternativeBuffer) {
              if (asString === ansi.disableAlternativeBuffer) {
                this._inAlternativeBuffer = false;
              }
            } else {
              // !this._inAlternativeBuffer
              if (asString === ansi.enableAlternativeBuffer) {
                this._inAlternativeBuffer = true;
              } else if (asString === ansi.cursorHome) {
                this._writeColumn = 0;
              }
            }

            continue; // No further processing of escape sequence.
          }
        } else if (nextChar !== undefined) {
          // ESC followed by single char.
          const sequence = chars.slice(i, i + 2);
          ret.push(...sequence);
          i += 1;
          continue; // No further processing of escape sequence.
        }
      }

      switch (char) {
        case NL:
          if (this._writeColumn === 0 && (c_oflag & Termios.OutputFlag.ONOCR) > 0) {
            break;
          }
          this._writeColumn = 0;
          if ((c_oflag & Termios.OutputFlag.ONLCR) > 0) {
            ret.push(CR, NL);
          } else {
            ret.push(NL);
          }
          break;
        default:
          if (!this._inAlternativeBuffer && char >= 32) {
            this._writeColumn++;
          }
          ret.push(char);
          break;
      }
    }

    return ret;
  }

  /**
   * Extract and return up to maxChars from _readBuffer, or all characters if maxChars is null,
   * leaving the remainder in the buffer.
   * _readBuffer may or may not be empty when this is called.
   */
  protected _readFromBuffer(maxChars: number | null): number[] {
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

  private _available?: PromiseDelegate<void>;
  protected _enabled: boolean = false;
  private _inAlternativeBuffer = false;
  private _utf8Decoder?: TextDecoder;
  protected _writeColumn = 0;

  protected _readBuffer: number[] = [];
}
