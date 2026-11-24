/**
 * Input that is async only.
 */
export interface IAsyncInput {
  isTerminal(): boolean;
  readAsync(maxChars: number | null): Promise<string>;
}
