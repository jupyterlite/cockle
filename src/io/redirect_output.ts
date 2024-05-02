import { Output } from "./output"
import { BufferedOutput } from "./buffered_output"

export class RedirectOutput extends BufferedOutput {
  constructor(target: Output) {
    super()
    this.target = target
  }

  override async flush(): Promise<void> {
    this.data.forEach((line) => {
      this.target.write(line)
    })
    this.clear()
    await this.target.flush()
  }

  private readonly target: Output
}
