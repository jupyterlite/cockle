import { Output } from "./output"

export abstract class BufferedOutput extends Output {
  protected data: string[] = []  // Should be protected really.

  constructor() {
    super()
  }

  protected clear() {
    this.data = []
  }

  override async write(text: string): Promise<void> {
    this.data.push(text)
  }
}
