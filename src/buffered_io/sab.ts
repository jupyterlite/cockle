import type { IPosixSignal } from './defs';

export namespace SAB {
  // Indexes into Int32Arrays.
  export const REQUEST_INDEX = 0;
  export const TIMEOUT_INDEX = 1;
  export const RESULT_TYPE_INDEX = 2;
  export const LENGTH_INDEX = 3;
  export const START_INDEX = 4;

  // Possible values of REQUEST_INDEX:
  export const NO_REQUEST_VALUE = 0;
  export const REQUEST_VALUE = 1;
  export const MORE_TO_FOLLOW_VALUE = 2;
  export const ABORT_VALUE = 3;

  // Possible values of RESULT_TYPE_INDEX:
  export const CHARS_RESULT = 0;
  export const SIGNALS_RESULT = 1;
  export const EOF_RESULT = 2;

  export const maxChars: number = 1000; // Number of characters that can be stored in the buffer.

  // Total length of Int32Array.
  export const length = START_INDEX + maxChars;

  const maxTimeoutMs = 100000; // Treated as Infinity.

  // Encode timeoutMs to Int32 to pass via SharedArrayBuffer.
  // Negative timeoutMs means wait forever (no/infinite timeout).
  export function encodeTimeout(timeoutMs: number): number {
    return timeoutMs < 0 || timeoutMs >= maxTimeoutMs ? maxTimeoutMs : Math.round(timeoutMs);
  }

  // Decode Int32 timeoutMs received via SharedArrayBuffer, inverse of encodeTimeout.
  export function decodeTimeout(encodedTimeout: number): number {
    return encodedTimeout >= maxTimeoutMs ? -1 : encodedTimeout;
  }

  // Encode POSIX signals as Int32s to pass via SharedArrayBuffer.
  // Each signal is encoded as [signal, rows, columns], with rows and columns of -1 if no args.
  export function encodeSignals(signals: IPosixSignal[]): number[] {
    const ret: number[] = [];
    for (const { signal, args } of signals) {
      ret.push(signal, args?.rows ?? -1, args?.columns ?? -1);
    }
    return ret;
  }

  // Decode POSIX signals received via SharedArrayBuffer, inverse of encodeSignals.
  export function decodeSignals(encoded: number[]): IPosixSignal[] {
    const ret: IPosixSignal[] = [];
    for (let i = 0; i < encoded.length; i += 3) {
      const [signal, rows, columns] = encoded.slice(i, i + 3);
      ret.push(rows < 0 ? { signal } : { signal, args: { rows, columns } });
    }
    return ret;
  }
}
