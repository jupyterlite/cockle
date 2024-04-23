import { Output } from "./output"
import { BufferedOutput } from "./buffered_output"

export class RedirectOutput extends BufferedOutput {
  private readonly target: Output

  constructor(target: Output) {
    super()
    this.target = target
  }

  override async flush(): Promise<void> {
    for (const text of this.data) {
      await this.target.write(text)
    }
    this.clear()
    await this.target.flush()
  }
}
