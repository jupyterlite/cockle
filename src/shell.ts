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
    this._currentLine = ""

    this._env = new Map()
    this._env.set("PS1", "\x1b[1;31mjs-shell:$\x1b[1;0m ")  // red color
    this._env.set("PWD", "/")
    this._env.set("COLUMNS", "0")
    this._env.set("LINES", "0")
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
    this._env.set("COLUMNS", columns.toString())
    this._env.set("LINES", rows.toString())
  }

  async start(): Promise<void> {
    const prompt = this._env.get("PS1")
    if (prompt) {
      await this.output(prompt)
    }
  }

  private async _inputSingleChar(char: string): Promise<void> {
    // Is char always just one character?
    if (char == "\r") {
      await this.output("\r\n")
      const cmdText = this._currentLine
      this._currentLine = ""
      await this._runCommands(cmdText)

      const prompt = this._env.get("PS1")
      if (prompt) {
        await this.output(prompt)
      }
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
        const context = new Context(cmdArgs, this._filesystem, stdout, this._env)
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
  private _currentLine: string
  private _env: Map<string, string>
}
