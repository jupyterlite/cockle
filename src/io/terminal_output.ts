import { BufferedOutput } from "./buffered_output"
import { IOutputCallback } from "../callback"

export class TerminalOutput extends BufferedOutput {

  // Needs to know if supports terminal escape codes.

  constructor(outputCallback: IOutputCallback) {
    super()
    this._outputCallback = outputCallback
  }

  override async flush(): Promise<void> {
    this.data.forEach(async (line) => {
      await this._outputCallback(line)
    })
    this.clear()
  }

  override async write(text: string): Promise<void> {
    if (text.endsWith('\n')) {
      text = text.slice(0, -1) + '\r\n'
    }
    await super.write(text)
  }

  private _outputCallback: IOutputCallback
}
