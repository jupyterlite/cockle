import { IInput } from './input';
import { IStdinCallback } from '../callback';

export class TerminalInput implements IInput {
  constructor(readonly stdinCallback?: IStdinCallback) {}

  isTerminal(): boolean {
    return true;
  }

  read(maxChars: number | null): number[] {
    if (this.stdinCallback === undefined) {
      return [];
    }
    return this.stdinCallback(maxChars);
  }
}
