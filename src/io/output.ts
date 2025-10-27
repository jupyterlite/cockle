export interface IOutput {

  flush(): void;

  isTerminal(): boolean;

  // Use isTerminal in preference to this, this will eventually be removed.
  supportsAnsiEscapes(): boolean;

  write(text: string): void;
}
