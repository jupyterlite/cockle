import { IOutput } from './output';

/**
 * Dummy output that silently swallows all output.
 * Used by IContext when no command is running, should never be written to.
 */
export class DummyOutput implements IOutput {
  flush(): void {}

  supportsAnsiEscapes(): boolean {
    return false;
  }

  write(text: string): void {}
}
