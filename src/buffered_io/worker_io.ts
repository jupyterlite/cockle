import { PromiseDelegate } from '@lumino/coreutils';
import type { IPosixSignalHandler, IWorkerIO, StdinResult } from './defs';
import type { IWorkerOutputCallback } from '../callback_internal';
import { stringFromCharCodes } from '../utils';

export abstract class WorkerIO implements IWorkerIO {
  constructor(
    readonly outputCallback: IWorkerOutputCallback,
    readonly posixSignalHandler: IPosixSignalHandler
  ) {}

  async canEnable(): Promise<void> {
    await this._available?.promise;
  }

  async disable(): Promise<void> {
    if (!this._enabled) {
      return;
    }

    this._enabled = false;
    this._eof = false;
    this._available?.resolve();
  }

  async enable(): Promise<void> {
    this._enabled = true;
    this._available = new PromiseDelegate<void>();
  }

  get enabled(): boolean {
    return this._enabled;
  }

  pollInput(timeoutMs: number): boolean {
    if (!this._enabled) {
      throw new Error('WorkerIO.pollInput when disabled');
    }

    // Negative timeoutMs means wait forever (infinite timeout).
    // Zero timeout means return immediately.
    if (!this._readable() && timeoutMs !== 0) {
      this._postRead(this._getStdin(timeoutMs));
    }
    return this._readable();
  }

  read(maxChars: number | null): number[] {
    if (!this._enabled) {
      throw new Error('WorkerIO.read when disabled');
    }

    if (maxChars !== null && maxChars <= 0) {
      return [];
    }

    while (!this._readable()) {
      this._postRead(this._getStdin(-1));
    }
    return this._readFromBuffer(maxChars);
  }

  async readAsync(maxChars: number | null, timeoutMs: number): Promise<number[]> {
    if (!this._enabled) {
      throw new Error('WorkerIO.readAsync when disabled');
    }

    if (maxChars !== null && maxChars <= 0) {
      return [];
    }

    // Negative timeoutMs means wait forever (infinite timeout).
    // Zero timeout means return immediately.
    while (!this._readable()) {
      const result = await this._getStdinAsync(timeoutMs);
      this._postRead(result);
      if (result === '' && timeoutMs >= 0) {
        break;
      }
    }
    return this._readFromBuffer(maxChars);
  }

  write(text: string | Int8Array | number[], freshLine: boolean = false): void {
    const output = typeof text === 'string' ? text : stringFromCharCodes(text);
    this.outputCallback(output, freshLine ? { freshLine } : undefined);
  }

  protected abstract _getStdin(timeoutMs: number): StdinResult;

  protected abstract _getStdinAsync(timeoutMs: number): Promise<StdinResult>;

  protected _postRead(result: StdinResult): void {
    if (result === null) {
      this._eof = true;
    } else if (typeof result === 'string') {
      for (let i = 0; i < result.length; i++) {
        this._readBuffer.push(result.charCodeAt(i));
      }
    } else {
      result.forEach(item => this.posixSignalHandler(item));
    }
  }

  // True if a read would return immediately, with either characters or end-of-file.
  private _readable(): boolean {
    return this._readBuffer.length > 0 || this._eof;
  }

  /**
   * Extract and return up to maxChars from _readBuffer, or all characters if maxChars is null,
   * leaving the remainder in the buffer.
   * _readBuffer may or may not be empty when this is called.
   */
  protected _readFromBuffer(maxChars: number | null): number[] {
    this._eof = false;
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
  private _eof = false; // End-of-file received but not yet read.

  protected _readBuffer: number[] = [];
}
