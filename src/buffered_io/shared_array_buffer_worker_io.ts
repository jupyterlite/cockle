import type { IWorkerIO } from './defs';
import { SAB } from './sab';
import { WorkerIO } from './worker_io';
import type { IOutputCallback } from '../callback';
import type { Termios } from '../termios';

export class SharedArrayBufferWorkerIO extends WorkerIO implements IWorkerIO {
  constructor(
    outputCallback: IOutputCallback,
    termios: Termios.Termios,
    sharedArrayBuffer: SharedArrayBuffer
  ) {
    super(outputCallback, termios);
    const readLength = SAB.maxChars + 4;
    this._sharedArrayBuffer = sharedArrayBuffer;
    this._intArray = new Int32Array(this._sharedArrayBuffer, 0, readLength);
  }

  protected _getStdin(timeoutMs: number): string {
    if (Atomics.load(this._intArray, SAB.REQUEST_INDEX) !== SAB.NO_REQUEST_VALUE) {
      console.error('SharedArrayBuffer stdin request already pending');
    }

    // Request stdin from main worker.
    Atomics.store(this._intArray, SAB.REQUEST_INDEX, SAB.REQUEST_VALUE);
    Atomics.store(this._intArray, SAB.TIMEOUT_INDEX, SAB.encodeTimeout(timeoutMs));
    Atomics.notify(this._intArray, SAB.REQUEST_INDEX, 1);

    Atomics.wait(this._intArray, SAB.REQUEST_INDEX, SAB.REQUEST_VALUE);
    const len = Atomics.load(this._intArray, SAB.LENGTH_INDEX);
    let ret = '';
    for (let i = 0; i < len; i++) {
      ret += String.fromCharCode(Atomics.load(this._intArray, SAB.START_INDEX + i));
    }
    return ret;
  }

  protected async _getStdinAsync(timeoutMs: number): Promise<string> {
    if (Atomics.load(this._intArray, SAB.REQUEST_INDEX) !== SAB.NO_REQUEST_VALUE) {
      console.error('SharedArrayBuffer stdin request already pending');
    }

    // Request stdin from main worker.
    Atomics.store(this._intArray, SAB.REQUEST_INDEX, SAB.REQUEST_VALUE);
    Atomics.store(this._intArray, SAB.TIMEOUT_INDEX, SAB.encodeTimeout(timeoutMs));
    Atomics.notify(this._intArray, SAB.REQUEST_INDEX, 1);

    const { async, value } = Atomics.waitAsync(
      this._intArray,
      SAB.REQUEST_INDEX,
      SAB.REQUEST_VALUE
    );
    if (async) {
      await value;
    }

    const len = Atomics.load(this._intArray, SAB.LENGTH_INDEX);
    let ret = '';
    for (let i = 0; i < len; i++) {
      ret += String.fromCharCode(Atomics.load(this._intArray, SAB.START_INDEX + i));
    }
    return ret;
  }

  private _intArray: Int32Array;
  private _sharedArrayBuffer: SharedArrayBuffer;
}
