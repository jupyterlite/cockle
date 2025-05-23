import type { IDisposable } from '@lumino/disposable';
import { IOutputCallback } from '../callback';
import { ITermios, Termios } from '../termios';

export interface IMainIO extends IDisposable {
  disable(): Promise<void>;
  enable(): Promise<void>;
  get enabled(): boolean;
  push(chars: string): Promise<void>;
  registerSendStdinNow(sendStdinNow: IOutputCallback): void;
}

export interface IWorkerIO {
  allowAdjacentNewline(set: boolean): void;
  disable(): Promise<void>;
  enable(): Promise<void>;
  poll(timeoutMs: number): number;
  read(maxChars: number | null): number[];
  readAsync(maxChars: number | null): Promise<number[]>;
  setTermios(iTermios: ITermios): void;
  get termios(): Termios;
  utf8ArrayToString(chars: Int8Array): string;
  write(text: string | Int8Array | number[]): void;
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
  error?: string;
  text?: string | null; // null means timeout reached before any input available.
}

/**
 * Interface for handler of stdin requests.
 */
export interface IStdinHandler {
  (stdinRequest: IStdinRequest): Promise<IStdinReply>;
}
