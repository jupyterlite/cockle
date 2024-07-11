import { BufferedOutput } from "./buffered_output"
import { IInput } from "./input"

export class Pipe extends BufferedOutput implements IInput {
  override async flush(): Promise<void> {
  }

  read(): string {
    const ret = this.allContent
    this.clear()
    return ret
  }
}
