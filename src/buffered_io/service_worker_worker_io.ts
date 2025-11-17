import { IWorkerIO } from './defs';
import { ServiceWorkerUtils } from './service_worker_utils';
import { WorkerIO } from './worker_io';
import { IOutputCallback } from '../callback';
import { Termios } from '../termios';

export class ServiceWorkerWorkerIO extends WorkerIO implements IWorkerIO {
  constructor(
    outputCallback: IOutputCallback,
    termios: Termios.Termios,
    baseUrl: string,
    browsingContextId: string,
    shellId: string
  ) {
    super(outputCallback, termios);
    this._utils = new ServiceWorkerUtils(baseUrl, browsingContextId, shellId);
  }

  poll(timeoutMs: number): number {
    if (!this._enabled) {
      throw new Error('ServiceWorkerWorkerIO.poll when disabled');
    }

  timeoutMs = timeoutMs < 0 ? Infinity : timeoutMs;
    let readable = this._readBuffer.length > 0;
    if (!readable && timeoutMs > 0) {
      const chars = this._utils.getStdin(timeoutMs);
      this._postRead(chars);
      // If chars.length > 0 then there are characters to read, so readable is true.
      readable = this._readBuffer.length > 0;
    }

    // Constants.
    const POLLIN = 1;
    const POLLOUT = 4;

    const writable = true;
    return (readable ? POLLIN : 0) | (writable ? POLLOUT : 0);
  }

  read(maxChars: number | null): number[] {
    if (!this._enabled) {
      throw new Error('ServiceWorkerWorkerIO.read when disabled');
    }

    if (maxChars !== null && maxChars <= 0) {
      return [];
    }

    if (this._readBuffer.length > 0) {
      // If have cached read data just return that.
      return this._readFromBuffer(maxChars);
    }

    const chars = this._utils.getStdin(0);
    this._postRead(chars);
    return this._readFromBuffer(maxChars);
  }

  async readAsync(maxChars: number | null, timeoutMs: number): Promise<number[]> {
    if (!this._enabled) {
      throw new Error('ServiceWorkerWorkerIO.readAsync when disabled');
    }

    if (maxChars !== null && maxChars <= 0) {
      return [];
    }

    if (this._readBuffer.length > 0) {
      // If have cached read data just return that.
      return this._readFromBuffer(maxChars);
    }

    const chars = await this._utils.getStdinAsync(timeoutMs < 0 ? Infinity : timeoutMs);
    this._postRead(chars);
    return this._readFromBuffer(maxChars);
  }

  protected _clear(): void {}

  private _postRead(chars: string): void {
    const read = chars.split('').map(ch => ch.charCodeAt(0));
    const processed = this._processReadChars(read);
    this._readBuffer.push(...processed);
    this._maybeEchoToOutput(processed);
  }

  private _utils: ServiceWorkerUtils;
}
