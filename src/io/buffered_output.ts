import { IOutput } from './output';

export abstract class BufferedOutput implements IOutput {
  get allContent(): string {
    return this.data.join('');
  }

  clear() {
    this.data = [];
  }

  abstract flush(): void;

  supportsAnsiEscapes(): boolean {
    return false;
  }

  write(text: string): void {
    this.data.push(text);
  }

  protected data: string[] = [];
}
