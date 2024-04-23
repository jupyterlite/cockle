import { BufferedOutput } from "./buffered_output"

export class TerminalOutput extends BufferedOutput {

  // Needs to know if supports terminal escape codes.

  constructor() {
    super()
  }

  override async flush(): Promise<void> {
    // Send output to terminal...
    this.clear()
  }
}
