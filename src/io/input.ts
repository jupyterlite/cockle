export interface IInput {
  isTerminal(): boolean;

  /**
   * Async read of up to maxChars.
   * This is used by TypeScript/JavaScript commands, both builtin and external.
   */
  readAsync(maxChars: number | null): Promise<number[]>;

  /**
   * Read up to maxChars as a sequence of utf16 character codes, or all available characters if
   * maxChars is null.
   * This is the read function used by WebAssembly commands.
   * Could perhaps return a TypedArray instead?
   */
  read(maxChars: number | null): number[];
}
