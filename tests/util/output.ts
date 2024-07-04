import { IOutputCallback } from "../../src"

/**
 * Provides outputCallback to mock a terminal.
 */
export class MockTerminalOutput {
  constructor(start: boolean = true) {
    this._started = start
  }

  callback: IOutputCallback = async (output: string) => {
    if (this._started) {
      this._text = this._text + output
    }
  }

  clear() {
    this._text = ""
  }

  start() {
    this._started = true
  }

  get text(): string {
    return this._text
  }

  private _started: boolean
  private _text: string = ""
}
