import { OutputCallback } from "../../src"

/**
 * Provides outputCallback to mock a terminal.
 */
export class MockTerminalOutput {
  callback: OutputCallback = async (output: string) => {
    this._text = this._text + output
  }

  clear() {
    this._text = ""
  }

  get text(): string {
    return this._text
  }

  private _text: string = ""
}
