import { BufferedOutput } from "./buffered_output"
import { IOutput } from "./output"

export class RedirectOutput extends BufferedOutput {
  constructor(target: IOutput) {
    super()
    this.target = target
  }

  override async flush(): Promise<void> {
    this.data.forEach(async (line) => {
      await this.target.write(line)
    })
    this.clear()
    await this.target.flush()
  }

  private readonly target: IOutput
}
