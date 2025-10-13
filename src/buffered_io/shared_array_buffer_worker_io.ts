import { IWorkerIO } from './defs';
import { SAB } from './sab';
import { WorkerIO } from './worker_io';
import { IOutputCallback } from '../callback';
import { Termios } from '../termios';

export class SharedArrayBufferWorkerIO extends WorkerIO implements IWorkerIO {
  constructor(
    outputCallback: IOutputCallback,
    termios: Termios.Termios,
    sharedArrayBuffer: SharedArrayBuffer
  ) {
    super(outputCallback, termios);
    const readLength = SAB.maxChars + 3;
    this._sharedArrayBuffer = sharedArrayBuffer;
    this._intArray = new Int32Array(this._sharedArrayBuffer, 0, readLength);
  }

  /**
   * Poll for whether readable (there is input ready to read) and/or writable.
   * Currently assumes always writable.
   */
  poll(timeoutMs: number): number {
    if (!this._enabled) {
      throw new Error('SharedArrayBufferWorkerIO.poll when disabled');
    }

    // Constants.
    const POLLIN = 1;
    const POLLOUT = 4;

    const writable = true;

    if (this._readBuffer.length > 0) {
      return POLLIN | (writable ? POLLOUT : 0);
    }

    if (timeoutMs < 0) {
      timeoutMs = Infinity;
    }
    const readableCheck = Atomics.wait(this._intArray, SAB.MAIN, this._readCount, timeoutMs);
    const readable = readableCheck === 'not-equal';
    return (readable ? POLLIN : 0) | (writable ? POLLOUT : 0);
  }

  read(maxChars: number | null): number[] {
    if (!this._enabled) {
      throw new Error('SharedArrayBufferWorkerIO.read when disabled');
    }

    if (maxChars !== null && maxChars <= 0) {
      return [];
    }

    if (this._readBuffer.length > 0) {
      // If have cached read data just return that.
      return this._readFromBuffer(maxChars);
    }

    Atomics.wait(this._intArray, SAB.MAIN, this._readCount);

    return this._postRead(maxChars);
  }

  async readAsync(maxChars: number | null, timeoutMs: number): Promise<number[]> {
    if (!this._enabled) {
      throw new Error('SharedArrayBufferWorkerIO.readAsync when disabled');
    }

    if (maxChars !== null && maxChars <= 0) {
      return [];
    }

    if (this._readBuffer.length > 0) {
      // If have cached read data just return that.
      return this._readFromBuffer(maxChars);
    }

    const { async, value } = Atomics.waitAsync(
      this._intArray,
      SAB.MAIN,
      this._readCount,
      timeoutMs > 0 ? timeoutMs : Infinity
    );
    if (async) {
      await value;
    }

    return this._postRead(maxChars);
  }

  private _postRead(maxChars: number | null): number[] {
    const readCount = Atomics.load(this._intArray, SAB.MAIN);
    if (readCount === this._readCount) {
      return [];
    }

    const read = this._loadFromSharedArrayBuffer();
    this._readCount++;

    // Notify main worker that chars have been read and new ones can be stored.
    Atomics.store(this._intArray, SAB.WORKER, this._readCount);
    Atomics.notify(this._intArray, SAB.WORKER, 1);

    this._readBuffer = this._processReadChars(read);
    this._maybeEchoToOutput(this._readBuffer);
    return this._readFromBuffer(maxChars);
  }

  protected _clear() {
    this._intArray[SAB.MAIN] = 0;
    this._intArray[SAB.WORKER] = 0;
    this._readCount = 0;
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

  private _sharedArrayBuffer: SharedArrayBuffer;
  private _intArray: Int32Array;
  private _readCount: number = 0;
}
