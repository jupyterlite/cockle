import type { IInput } from './input';
import type { IPollCallback, IStdinAsyncCallback, IStdinCallback } from '../callback_internal';

export class TerminalInput implements IInput {
  constructor(
    readonly pollCallback: IPollCallback,
    readonly stdinCallback: IStdinCallback,
    readonly stdinAsyncCallback: IStdinAsyncCallback
  ) {}

  isTerminal(): boolean {
    return true;
  }

  poll(timeoutMs: number): boolean {
    return this.pollCallback(timeoutMs);
  }

  async readAsync(maxChars: number | null): Promise<number[]> {
    return await this.stdinAsyncCallback(maxChars);
  }

  read(maxChars: number | null): number[] {
    return this.stdinCallback(maxChars);
  }
}
