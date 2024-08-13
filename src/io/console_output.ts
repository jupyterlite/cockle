import { IOutput } from './output';

export class ConsoleOutput implements IOutput {
  async flush(): Promise<void> {}

  supportsAnsiEscapes(): boolean {
    return false;
  }

  write(text: string): void {
    console.log(text);
  }
}
