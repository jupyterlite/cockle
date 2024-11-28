import { BufferedOutput } from './buffered_output';

interface OutputCallback {
  (output: string): void;
}

export class TerminalOutput extends BufferedOutput {
  constructor(
    readonly outputCallback: OutputCallback,
    readonly prefix: string | null = null,
    readonly suffix: string | null = null
  ) {
    super();
  }

  override flush(): void {
    this.data.forEach(line => this.outputCallback(line));
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
