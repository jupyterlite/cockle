import { PromiseDelegate } from '@lumino/coreutils';
import { IWorkerIO } from './defs';
import { IOutputCallback } from '../callback';
import { InputFlag, ITermios, LocalFlag, OutputFlag, Termios } from '../termios';

export abstract class WorkerIO implements IWorkerIO {
  constructor(readonly outputCallback: IOutputCallback) {}

  async canEnable(): Promise<void> {
    await this._available?.promise;
  }

  async disable(): Promise<void> {
    this._enabled = false;
    this._clear();
    this._available?.resolve();
  }

  async enable(): Promise<void> {
    this._enabled = true;
    this._available = new PromiseDelegate<void>();
  }

  get enabled(): boolean {
    return this._enabled;
  }

  abstract poll(timeoutMs: number): number;

  abstract read(maxChars: number | null): number[];

  abstract readAsync(maxChars: number | null, timeoutMs: number): Promise<number[]>;

  setTermios(iTermios: ITermios): void {
    this.termios.set(iTermios);
    this._writeColumn = 0;
  }

  get termios(): Termios {
    return this._termios;
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

  protected abstract _clear(): void;

  protected _maybeEchoToOutput(chars: number[]): void {
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

  protected _processReadChars(chars: number[]): number[] {
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

  protected _processWriteChars(chars: Int8Array | number[]): number[] {
    const NL = 10; // Linefeed \n
    const CR = 13; // Carriage return \r

    const { c_oflag } = this.termios;
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
          if (this._writeColumn === 0 && (c_oflag & OutputFlag.ONOCR) > 0) {
            break;
          }
          this._writeColumn = 0;
          if ((c_oflag & OutputFlag.ONLCR) > 0) {
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
  private _termios = new Termios();
  protected _writeColumn = 0;
  private _utf8Decoder?: TextDecoder;

  protected _readBuffer: number[] = [];
}
