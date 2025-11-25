import type { IMainIO } from './defs';
import { MainIO } from './main_io';
import { SAB } from './sab';

/**
 * Main worker buffers characters locally, and stores just one character at a time in the
 * SharedArrayBuffer so that the web worker can read it.
 */
export class SharedArrayBufferMainIO extends MainIO implements IMainIO {
  constructor() {
    super();
    const bytesPerElement = Int32Array.BYTES_PER_ELEMENT;
    const readLength = SAB.maxChars + 4;
    this._sharedArrayBuffer = new SharedArrayBuffer(readLength * bytesPerElement);
    this._intArray = new Int32Array(this._sharedArrayBuffer, 0, readLength);

    this._intArray[SAB.REQUEST_INDEX] = SAB.NO_REQUEST_VALUE;
  }

  override async disable(): Promise<void> {
    if (!this._enabled) {
      return;
    }

    // Cancel Atomics.waitAsync by passing ABORT_VALUE.
    Atomics.store(this._intArray, SAB.REQUEST_INDEX, SAB.ABORT_VALUE);
    Atomics.notify(this._intArray, SAB.REQUEST_INDEX, 1);

    await super.disable();
  }

  override async enable(): Promise<void> {
    await super.enable();

    this._intArray[SAB.REQUEST_INDEX] = SAB.NO_REQUEST_VALUE;

    // Start listening for stdin requests.
    this._waitForRequest();
  }

  private async _handleStdin(): Promise<void> {
    const timeoutMs = SAB.decodeTimeout(Atomics.load(this._intArray, SAB.TIMEOUT_INDEX));
    const chars = await this._handleStdinImpl(timeoutMs);
    await this._sendResult(chars);
  }

  private async _sendResult(chars: string): Promise<void> {
    const len = chars.length;
    Atomics.store(this._intArray, SAB.LENGTH_INDEX, len);
    for (let i = 0; i < len; i++) {
      Atomics.store(this._intArray, SAB.START_INDEX + i, chars.charCodeAt(i));
    }

    Atomics.store(this._intArray, SAB.REQUEST_INDEX, SAB.NO_REQUEST_VALUE);
    this._waitForRequest(); // Start listening for next request.
    Atomics.notify(this._intArray, SAB.REQUEST_INDEX, 1);
  }

  private _waitForRequest(): void {
    const { async, value } = Atomics.waitAsync(
      this._intArray,
      SAB.REQUEST_INDEX,
      SAB.NO_REQUEST_VALUE
    );
    if (async) {
      value.then(() => {
        if (Atomics.load(this._intArray, SAB.REQUEST_INDEX) !== SAB.ABORT_VALUE) {
          this._handleStdin();
        }
      });
    } else {
      if (Atomics.load(this._intArray, SAB.REQUEST_INDEX) !== SAB.ABORT_VALUE) {
        this._handleStdin();
      }
    }
  }

  get sharedArrayBuffer(): SharedArrayBuffer {
    return this._sharedArrayBuffer;
  }

  private _intArray: Int32Array;
  private _sharedArrayBuffer: SharedArrayBuffer;
}
