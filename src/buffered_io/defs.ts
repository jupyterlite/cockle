import type { IDisposable } from '@lumino/disposable';
import { IOutputCallback } from '../callback';
import { ITermios, Termios } from '../termios';

export interface IMainIO extends IDisposable {
  disable(): Promise<void>;
  enable(): Promise<void>;
  get enabled(): boolean;
  registerSendStdinNow(sendStdinNow: IOutputCallback): void;
}

export interface IWorkerIO {
  allowAdjacentNewline(set: boolean): void;
  disable(): Promise<void>;
  enable(): Promise<void>;
  poll(timeoutMs: number): number;
  read(maxChars: number | null): number[];
  setTermios(iTermios: ITermios): void;
  get termios(): Termios;
  utf8ArrayToString(chars: Int8Array): string;
  write(text: string | Int8Array | number[]): void;
}
