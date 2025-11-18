export namespace SAB {
  // Indexes into Int32Arrays.
  export const REQUEST_INDEX = 0;
  export const TIMEOUT_INDEX = 1;
  export const LENGTH_INDEX = 2;
  export const START_INDEX = 3;

  // Possible values of REQUEST_INDEX:
  export const NO_REQUEST_VALUE = 0;
  export const REQUEST_VALUE = 1;
  export const ABORT_VALUE = 2;

  export const maxChars: number = 64; // Max number of characters that can be stored in the buffer.

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
}
