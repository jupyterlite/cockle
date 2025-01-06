import { IOutput } from './output';
import { IOutputCallback } from '../callback';

export class TerminalOutput implements IOutput {
  constructor(
    readonly outputCallback: IOutputCallback,
    readonly prefix: string | null = null,
    readonly suffix: string | null = null
  ) {}

  flush(): void {}

  supportsAnsiEscapes(): boolean {
    return true;
  }

  write(text: string): void {
    if (text.length < 1) {
      return;
    }

    if (this.prefix !== null) {
      text = this.prefix + text;
    }
    if (this.suffix !== null) {
      text = text + this.suffix;
    }
    this.outputCallback(text);
  }
}
