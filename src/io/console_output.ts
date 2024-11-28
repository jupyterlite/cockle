import { IOutput } from './output';

export class ConsoleOutput implements IOutput {
  flush(): void {}

  supportsAnsiEscapes(): boolean {
    return false;
  }

  write(text: string): void {
    console.log(text);
  }
}
