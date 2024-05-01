import { IFileSystem } from "./file_system"

export interface OutputCallback { (output: string): Promise<void> }

export class Shell {
  constructor(
    filesystem: IFileSystem,
    outputCallback: OutputCallback,
  ) {
    this._filesystem = filesystem
    this._outputCallback = outputCallback
    this._prompt = "\x1b[1;31mjs-shell:$\x1b[1;0m "; // red color.
    this._currentLine = ""
    console.log("XXXX", this._filesystem, this._prompt, this._currentLine)
  }

  async input(char: string): Promise<void> {
    // Is char always just one character?
    if (char == "\r") {
      await this.output("\r\n")
      //const cmd = this._currentLine
      this._currentLine = ""

      // Run command
      // Send results back via output()

      await this.output(this._prompt)
    } else {
      this._currentLine += char
      await this.output(char)
    }
  }

  async output(text: string): Promise<void> {
    this._outputCallback(text)
  }

  async setSize(rows: number, columns: number): Promise<void> {
    console.log("setSize", rows, columns)
  }

  async start(): Promise<void> {
    await this.output(this._prompt)
  }

  private readonly _filesystem: IFileSystem
  private readonly _outputCallback: OutputCallback
  private _prompt: string
  private _currentLine: string
}
