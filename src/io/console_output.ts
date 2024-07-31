import { IOutput } from './output';

export class ConsoleOutput implements IOutput {
  async flush(): Promise<void> {}

  supportsAnsiEscapes(): boolean {
    return false;
  }

  async write(text: string): Promise<void> {
    console.log(text);
  }
}
