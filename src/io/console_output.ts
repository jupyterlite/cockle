import { IOutput } from './output';

export class ConsoleOutput implements IOutput {
  flush(): void {}

  isTerminal(): boolean {
    return false;
  }

  supportsAnsiEscapes(): boolean {
    return false;
  }

  write(text: string): void {
    console.log(text);
  }
}
