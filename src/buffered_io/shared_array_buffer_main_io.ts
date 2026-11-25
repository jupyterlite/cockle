import type { IMainIO, IPosixSignal } from './defs';
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
    this._sharedArrayBuffer = new SharedArrayBuffer(SAB.length * bytesPerElement);
    this._intArray = new Int32Array(this._sharedArrayBuffer, 0, SAB.length);

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
    const result = await this._handleStdinImpl(timeoutMs);
    if (result === null) {
      Atomics.store(this._intArray, SAB.RESULT_TYPE_INDEX, SAB.EOF_RESULT);
      this._finishRequest();
    } else if (typeof result === 'string') {
      await this._sendResult(result);
    } else {
      this._sendSignals(result);
    }
  }

  private async _sendResult(chars: string): Promise<void> {
    Atomics.store(this._intArray, SAB.RESULT_TYPE_INDEX, SAB.CHARS_RESULT);

    let moreToFollow = true;
    while (moreToFollow) {
      moreToFollow = chars.length > SAB.maxChars;
      const len = moreToFollow ? SAB.maxChars : chars.length;

      Atomics.store(this._intArray, SAB.LENGTH_INDEX, len);
      for (let i = 0; i < len; i++) {
        Atomics.store(this._intArray, SAB.START_INDEX + i, chars.charCodeAt(i));
      }

      if (moreToFollow) {
        chars = chars.slice(SAB.maxChars);
        Atomics.store(this._intArray, SAB.REQUEST_INDEX, SAB.MORE_TO_FOLLOW_VALUE);
        Atomics.notify(this._intArray, SAB.REQUEST_INDEX, 1);

        const { async, value } = Atomics.waitAsync(
          this._intArray,
          SAB.REQUEST_INDEX,
          SAB.MORE_TO_FOLLOW_VALUE
        );
        if (async) {
          await value;
        }
      }
    }

    this._finishRequest();
  }

  private _sendSignals(signals: IPosixSignal[]): void {
    const encoded = SAB.encodeSignals(signals);
    if (encoded.length > SAB.maxChars) {
      console.error('Too many signals to send via SharedArrayBuffer');
      encoded.length = 0;
    }

    Atomics.store(this._intArray, SAB.RESULT_TYPE_INDEX, SAB.SIGNALS_RESULT);
    Atomics.store(this._intArray, SAB.LENGTH_INDEX, encoded.length);
    for (let i = 0; i < encoded.length; i++) {
      Atomics.store(this._intArray, SAB.START_INDEX + i, encoded[i]);
    }

    this._finishRequest();
  }

  private _finishRequest(): void {
    Atomics.store(this._intArray, SAB.REQUEST_INDEX, SAB.NO_REQUEST_VALUE);
    // Notify the worker before listening for the next request, as otherwise the notify may wake
    // the new listener rather than the worker.
    Atomics.notify(this._intArray, SAB.REQUEST_INDEX, 1);
    this._waitForRequest();
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
