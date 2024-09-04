export interface IInput {
  isTerminal(): boolean;

  /**
   * Read and return a single character as a sequence of ASCII character codes. Note this might be
   * more than one actual character such as \n or escape code for up arrow, etc. No further input is
   * indicated by a single-width character with an ASCII code of 4 (EOT = End Of Transmission).
   */
  readChar(): number[];
}
