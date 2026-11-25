export enum PosixSignal {
  SIGINT = 2,
  SIGWINCH = 28
}

/**
 * Callback registered by a JavaScript or external command to be notified of a POSIX signal.
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

/**
 * Set or unset the callback for a POSIX signal, returning the callback that it replaces, if any.
 */
export function setPosixSignalCallback(
  callbacks: Map<PosixSignal, IPosixSignalCallback>,
  signal: PosixSignal,
  callback: IPosixSignalCallback | undefined
): IPosixSignalCallback | undefined {
  const previous = callbacks.get(signal);
  if (callback === undefined) {
    callbacks.delete(signal);
  } else {
    callbacks.set(signal, callback);
  }
  return previous;
}
