import type { IDisposable } from '@lumino/disposable';
import type { IOutputCallback, ISize } from '../callback';
import type { PosixSignal } from '../posix_signal';

export interface IMainIO extends IDisposable {
  disable(): Promise<void>;
  enable(): Promise<void>;
  get enabled(): boolean;
  sendPosixSignal(signal: PosixSignal, args?: ISize): Promise<void>;
  push(chars: string): Promise<void>;
  registerSendStdinNow(sendStdinNow: IOutputCallback): void;
}

/**
 * A POSIX signal with optional arguments, passed from MainIO to WorkerIO.
 */
export interface IPosixSignal {
  signal: PosixSignal;
  args?: ISize; // Set for SIGWINCH.
}

/**
 * Result of a stdin request: characters (an empty string means timeout reached before any input
 * available), one or more POSIX signals, or null for end-of-file.
 */
export type StdinResult = string | IPosixSignal[] | null;

/**
 * Handler for a POSIX signal received by WorkerIO.
 */
export interface IPosixSignalHandler {
  (item: IPosixSignal): void;
}

export interface IWorkerIO {
  canEnable(): Promise<void>;
  disable(): Promise<void>;
  enable(): Promise<void>;
  get enabled(): boolean;
  // Negative timeoutMs means wait forever (no/infinite timeout).
  pollInput(timeoutMs: number): boolean;
  read(maxChars: number | null): number[];
  // Negative timeoutMs means wait forever (infinite timeout).
  readAsync(maxChars: number | null, timeoutMs: number): Promise<number[]>;
  // If freshLine is true, first start a new line if the cursor is not at the start of a line.
  write(text: string | Int8Array | number[], freshLine?: boolean): void;
}

/**
 * Handle stdin request from service worker.
 */
export interface IHandleStdin {
  (stdinRequest: IStdinRequest): Promise<IStdinReply>;
}

/**
 * Request for stdin via service worker.
 */
export interface IStdinRequest {
  shellId: string;
  timeoutMs: number;
  test?: boolean; // If true this is to test functionality, and returns 'ok' immediately.
}

/**
 * Reply to a stdin request via service worker.
 */
export interface IStdinReply {
  eof?: boolean;
  error?: string;
  signals?: IPosixSignal[];
  text?: string; // An empty string means timeout reached before any input available.
}
