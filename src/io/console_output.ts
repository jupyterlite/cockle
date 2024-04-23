import { Output } from "./output"

export class ConsoleOutput extends Output {
  override async flush(): Promise<void> {}

  override async write(text: string): Promise<void> {
    console.log(text)
  }
}
