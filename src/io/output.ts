export interface IOutput {
  flush(): Promise<void>
  write(text: string): Promise<void>
}
