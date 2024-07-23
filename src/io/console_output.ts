import { IOutput } from './output';

export class ConsoleOutput implements IOutput {
  async flush(): Promise<void> {}

  async write(text: string): Promise<void> {
    console.log(text);
  }
}
