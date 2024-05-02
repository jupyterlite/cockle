import { BufferedOutput } from "./buffered_output"
import { OutputCallback } from "../output_callback"

export class TerminalOutput extends BufferedOutput {

  // Needs to know if supports terminal escape codes.

  constructor(outputCallback: OutputCallback) {
    super()
    this._outputCallback = outputCallback
  }

  override async flush(): Promise<void> {
    this.data.forEach(async (line) => {
      await this._outputCallback(line)
    })
    this.clear()
  }

  private _outputCallback: OutputCallback
}
