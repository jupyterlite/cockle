import { Output } from "./output"

export abstract class BufferedOutput extends Output {
  constructor() {
    super()
  }

  protected clear() {
    this.data = []
  }

  override async write(text: string): Promise<void> {
    this.data.push(text)
  }

  protected data: string[] = []
}
