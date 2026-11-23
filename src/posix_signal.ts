export enum PosixSignal {
  SIGWINCH = 28
}

/**
 * Callback registered by a JavaScript or external command to be notified of POSIX signals.
 * For SIGWINCH the command should call its context's size() to obtain the new size.
 */
export interface IPosixSignalCallback {
  (signal: PosixSignal): void | Promise<void>;
}

/**
 * Call a command's POSIX signal callback without waiting for it, as it runs concurrently with the
 * command like a real signal handler. Errors are logged rather than propagated.
 */
export async function callPosixSignalCallback(
  callback: IPosixSignalCallback,
  signal: PosixSignal
): Promise<void> {
  try {
    await callback(signal);
  } catch (err) {
    console.error(`Error in POSIX signal callback: ${err}`);
  }
}
