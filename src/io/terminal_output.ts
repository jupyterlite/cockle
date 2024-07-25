import { BufferedOutput } from './buffered_output';
import { IOutputCallback } from '../callback';

export class TerminalOutput extends BufferedOutput {
  // Needs to know if supports terminal escape codes.

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

  override async write(text: string): Promise<void> {
    if (text.endsWith('\n')) {
      text = text.slice(0, -1) + '\r\n';
    }
    if (this.prefix !== null) {
      text = this.prefix + text;
    }
    if (this.suffix !== null) {
      text = text + this.suffix;
    }
    await super.write(text);
  }
}
