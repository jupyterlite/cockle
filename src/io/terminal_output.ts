import { BufferedOutput } from './buffered_output';
import { IOutputCallback } from '../callback';

export class TerminalOutput extends BufferedOutput {
  constructor(
    readonly outputCallback: IOutputCallback,
    readonly prefix: string | null = null,
    readonly suffix: string | null = null
  ) {
    super();
  }

  override async flush(): Promise<void> {
    this.data.forEach(async line => await this.outputCallback(line));
    this.clear();
  }

  override supportsAnsiEscapes(): boolean {
    return true;
  }

  override write(text: string): void {
    if (text.length < 1) {
      return;
    }

    if (this.prefix !== null) {
      text = this.prefix + text;
    }
    if (this.suffix !== null) {
      text = text + this.suffix;
    }
    super.write(text);
  }
}
