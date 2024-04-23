export abstract class Output {
  abstract flush(): Promise<void>
  abstract write(text: string): Promise<void>
}
