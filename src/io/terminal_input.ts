import { IInput } from './input';
import { IStdinCallback, IStdinAsyncCallback } from '../callback_internal';

export class TerminalInput implements IInput {
  constructor(
    readonly stdinCallback: IStdinCallback,
    readonly stdinAsyncCallback: IStdinAsyncCallback
  ) {}

  isTerminal(): boolean {
    return true;
  }

  async readAsync(maxChars: number | null): Promise<number[]> {
    return await this.stdinAsyncCallback(maxChars);
  }

  read(maxChars: number | null): number[] {
    return this.stdinCallback(maxChars);
  }
}
