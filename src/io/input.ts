export interface IInput {
  isTerminal(): boolean;

  /**
   * Read up to maxChars as a sequence of utf16 character codes.
   * This is the read function used by WebAssembly commands.
   * Could perhaps return a TypedArray instead?
   */
  read(maxChars: number): number[];
}
