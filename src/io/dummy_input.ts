import { IInput } from './input';

/**
 * Dummy input that returns immediately on read request.
 * Used by IContext when no command is running, should never be read from.
 */
export class DummyInput implements IInput {
  isTerminal(): boolean {
    return false;
  }

  async readAsync(maxChars: number | null): Promise<number[]> {
    return [];
  }

  read(maxChars: number | null): number[] {
    return [];
  }
}
