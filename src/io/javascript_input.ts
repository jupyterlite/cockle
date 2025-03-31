import { IInput } from './input';

export interface IJavaScriptInput {
  isTerminal(): boolean;
  readAsync(maxChars: number | null): Promise<string>;
}

export class JavaScriptInput implements IJavaScriptInput {
  constructor(readonly input: IInput) {}

  isTerminal(): boolean {
    return this.input.isTerminal();
  }

  async readAsync(maxChars: number | null): Promise<string> {
    const chars = await this.input.readAsync(maxChars);
    return String.fromCharCode(...chars);
  }
}
