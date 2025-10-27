import { IOutput } from './output';
import { IOutputCallback } from '../callback';

export class TerminalOutput implements IOutput {
  constructor(
    readonly outputCallback: IOutputCallback,
    prefix?: string,
    suffix?: string
  ) {
    this.prefix = prefix;
    this.suffix = suffix;
  }

  flush(): void {}

  isTerminal(): boolean {
    return true;
  }

  supportsAnsiEscapes(): boolean {
    return true;
  }

  write(text: string): void {
    if (text.length < 1) {
      return;
    }

    if (this.prefix !== undefined) {
      text = this.prefix + text;
    }
    if (this.suffix !== undefined) {
      text = text + this.suffix;
    }
    this.outputCallback(text);
  }

  prefix?: string;
  suffix?: string;
}
