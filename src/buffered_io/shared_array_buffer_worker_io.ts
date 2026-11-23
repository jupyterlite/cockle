import type { IPosixSignal, IPosixSignalHandler, IWorkerIO, StdinResult } from './defs';
import { SAB } from './sab';
import { WorkerIO } from './worker_io';
import type { IOutputCallback } from '../callback';
import type { Termios } from '../termios';

export class SharedArrayBufferWorkerIO extends WorkerIO implements IWorkerIO {
  constructor(
    outputCallback: IOutputCallback,
    posixSignalHandler: IPosixSignalHandler,
    termios: Termios.Termios,
    sharedArrayBuffer: SharedArrayBuffer
  ) {
    super(outputCallback, posixSignalHandler, termios);
    this._sharedArrayBuffer = sharedArrayBuffer;
    this._intArray = new Int32Array(this._sharedArrayBuffer, 0, SAB.length);
  }

  protected _getStdin(timeoutMs: number): StdinResult {
    if (Atomics.load(this._intArray, SAB.REQUEST_INDEX) !== SAB.NO_REQUEST_VALUE) {
      console.error('SharedArrayBuffer stdin request already pending');
    }

    // Request stdin from main worker.
    Atomics.store(this._intArray, SAB.TIMEOUT_INDEX, SAB.encodeTimeout(timeoutMs));

    let ret = '';
    let moreToFollow = true;
    while (moreToFollow) {
      Atomics.store(this._intArray, SAB.REQUEST_INDEX, SAB.REQUEST_VALUE);
      Atomics.notify(this._intArray, SAB.REQUEST_INDEX, 1);

      Atomics.wait(this._intArray, SAB.REQUEST_INDEX, SAB.REQUEST_VALUE);
      moreToFollow = Atomics.load(this._intArray, SAB.REQUEST_INDEX) === SAB.MORE_TO_FOLLOW_VALUE;

      if (Atomics.load(this._intArray, SAB.RESULT_TYPE_INDEX) === SAB.SIGNALS_RESULT) {
        return this._readSignals();
      }

      const len = Atomics.load(this._intArray, SAB.LENGTH_INDEX);
      for (let i = 0; i < len; i++) {
        ret += String.fromCharCode(Atomics.load(this._intArray, SAB.START_INDEX + i));
      }
    }
    return ret;
  }

  protected async _getStdinAsync(timeoutMs: number): Promise<StdinResult> {
    if (Atomics.load(this._intArray, SAB.REQUEST_INDEX) !== SAB.NO_REQUEST_VALUE) {
      console.error('SharedArrayBuffer stdin request already pending');
    }

    // Request stdin from main worker.
    Atomics.store(this._intArray, SAB.TIMEOUT_INDEX, SAB.encodeTimeout(timeoutMs));

    let ret = '';
    let moreToFollow = true;
    while (moreToFollow) {
      Atomics.store(this._intArray, SAB.REQUEST_INDEX, SAB.REQUEST_VALUE);
      Atomics.notify(this._intArray, SAB.REQUEST_INDEX, 1);

      const { async, value } = Atomics.waitAsync(
        this._intArray,
        SAB.REQUEST_INDEX,
        SAB.REQUEST_VALUE
      );
      if (async) {
        await value;
      }
      moreToFollow = Atomics.load(this._intArray, SAB.REQUEST_INDEX) === SAB.MORE_TO_FOLLOW_VALUE;

      if (Atomics.load(this._intArray, SAB.RESULT_TYPE_INDEX) === SAB.SIGNALS_RESULT) {
        return this._readSignals();
      }

      const len = Atomics.load(this._intArray, SAB.LENGTH_INDEX);
      for (let i = 0; i < len; i++) {
        ret += String.fromCharCode(Atomics.load(this._intArray, SAB.START_INDEX + i));
      }
    }
    return ret;
  }

  private _readSignals(): IPosixSignal[] {
    const len = Atomics.load(this._intArray, SAB.LENGTH_INDEX);
    const encoded: number[] = [];
    for (let i = 0; i < len; i++) {
      encoded.push(Atomics.load(this._intArray, SAB.START_INDEX + i));
    }
    return SAB.decodeSignals(encoded);
  }

  private _intArray: Int32Array;
  private _sharedArrayBuffer: SharedArrayBuffer;
}
