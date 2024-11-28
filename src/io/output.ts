export interface IOutput {
  flush(): void;
  supportsAnsiEscapes(): boolean;
  write(text: string): void;
}
