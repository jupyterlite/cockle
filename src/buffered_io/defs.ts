import type { IDisposable } from '@lumino/disposable';
import { IOutputCallback } from '../callback';

export interface IMainIO extends IDisposable {
  disable(): Promise<void>;
  enable(): Promise<void>;
  get enabled(): boolean;
  push(chars: string): Promise<void>;
  registerSendStdinNow(sendStdinNow: IOutputCallback): void;
}

export interface IWorkerIO {
  canEnable(): Promise<void>;
  disable(): Promise<void>;
  enable(): Promise<void>;
  get enabled(): boolean;
  poll(timeoutMs: number): number;
  read(maxChars: number | null): number[];
  // timeoutMs of 0 means no timeout, wait forever.
  readAsync(maxChars: number | null, timeoutMs: number): Promise<number[]>;
  utf8ArrayToString(chars: Int8Array): string;
  write(text: string | Int8Array | number[]): void;
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
  error?: string;
  text?: string; // An empty string means timeout reached before any input available.
}
