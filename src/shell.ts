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

  async input(char: string): Promise<void> {
    // Might be a multi-char string if begins with escape code.
    const code = char.charCodeAt(0)
    //console.log("CODE", code)
    if (code == 13) {  // \r
      await this.output("\r\n")
      const cmdText = this._currentLine
      this._currentLine = ""
      await this._runCommands(cmdText)
      await this.output(this._env.get("PS1") ?? "")
    } else if (code == 127) {  // Backspace
      if (this._currentLine.length > 0) {
        this._currentLine = this._currentLine.slice(0, -1);
        const backspace = "\x1B[1D"
        await this.output(backspace + ' ' + backspace)
      }
    } else if (code == 9) {  // Tab \t
      const possibles = await this._tabComplete(this._currentLine)
      if (possibles.length == 1) {
        const n = this._currentLine.length
        this._currentLine = possibles[0] + " "
        await this.output(this._currentLine.slice(n))
      } else if (possibles.length > 1) {
        const line = possibles.join("  ")
        this._currentLine = ""
        await this.output(`\r\n${line}\r\n${this._env.get("PS1") ?? ""}`)
      }
    } else if (code == 27) {  // Escape following by 1+ more characters
      const remainder = char.slice(1)
      if (remainder == "[A" || remainder == "[1A") {  // Up arrow

      } else if (remainder == "[B" || remainder == "[1B") {  // Down arrow

      }
    } else {
      this._currentLine += char
      await this.output(char)
    }
  }

  async inputs(chars: string[]): Promise<void> {
    for (let i = 0; i < chars.length; ++i) {
      await this.input(chars[i])
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
      stdout.write("\x1b[1;31mERROR...\x1b[1;0m\r\n")
      await stdout.flush()
    }
  }

  private async _tabComplete(text: string): Promise<string[]> {
    // Find all commands that begin with text.
    // Will need to extend to cover filenames too.
    return CommandRegistry.instance().match(text)
  }

  private readonly _filesystem: IFileSystem
  private readonly _outputCallback: OutputCallback
  private _currentLine: string
  private _env: Map<string, string>
}
