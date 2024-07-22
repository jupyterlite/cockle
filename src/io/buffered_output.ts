import { IOutput } from "./output"

export abstract class BufferedOutput implements IOutput {
  get allContent(): string {
    return this.data.join("")
  }

  clear() {
    this.data = []
  }

  abstract flush(): Promise<void>

  async write(text: string): Promise<void> {
    this.data.push(text)
  }

  protected data: string[] = []
}
