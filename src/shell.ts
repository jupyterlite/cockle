import { CommandRegistry } from "./command_registry"
import { Context } from "./context"
import { TerminalOutput } from "./io"
import { OutputCallback } from "./output_callback"
import { parse } from "./parse"
import { IFileSystem } from "./file_system"

export class Shell {
  constructor(
    filesystem: IFileSystem,
    outputCallback: OutputCallback,
  ) {
    this._filesystem = filesystem
    this._outputCallback = outputCallback
    this._prompt = "\x1b[1;31mjs-shell:$\x1b[1;0m " // red color.
    this._currentLine = ""
  }

  async input(text: string): Promise<void> {
    for (const char of text) {
      await this._inputSingleChar(char)
    }
  }

  async output(text: string): Promise<void> {
    await this._outputCallback(text)
  }

  async setSize(rows: number, columns: number): Promise<void> {
    console.log("setSize", rows, columns)
  }

  async start(): Promise<void> {
    await this.output(this._prompt)
  }

  private async _inputSingleChar(char: string): Promise<void> {
    // Is char always just one character?
    if (char == "\r") {
      await this.output("\r\n")
      const cmdText = this._currentLine
      this._currentLine = ""
      await this._runCommands(cmdText)
      await this.output(this._prompt)
    } else {
      this._currentLine += char
      await this.output(char)
    }
  }

  // Keeping this public for tests.
  async _runCommands(cmdText: string): Promise<void> {
    const ast = parse(cmdText)
    const ncmds = ast.commandCount
    const stdout = new TerminalOutput(this._outputCallback)
    try {
      for (let i = 0; i < ncmds; ++i) {
        const cmd = ast.command(i)
        const cmdName = cmd[0]
        const command = CommandRegistry.instance().create(cmdName)
        if (command === null) {
          // Give location of command in input?
          throw new Error(`No such command: '${cmdName}'`)
        }

        const cmdArgs = cmd.slice(1)
        const context = new Context(cmdArgs, this._filesystem, stdout)
        //const exit_code = await command?.run(context)
        await command?.run(context)
        await stdout.flush()
      }
    } catch (e) {
      // Send result via output??????  With color.  Should be to stderr.
      stdout.write("\x1b[1;31mERROR...\x1b[1;0m")
      await stdout.flush()
    }
  }

  private readonly _filesystem: IFileSystem
  private readonly _outputCallback: OutputCallback
  private _prompt: string
  private _currentLine: string
}
