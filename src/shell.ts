import { CommandRegistry } from "./command_registry"
import { Context } from "./context"
import { Environment } from "./environment"
import { IFileSystem } from "./file_system"
import { FileOutput, Output, TerminalOutput } from "./io"
import { IOutputCallback } from "./output_callback"
import { CommandNode, parse } from "./parse"
import * as FsModule from './wasm/fs'

export class Shell {
  constructor(
    outputCallback: IOutputCallback,
    mountpoint: string = '/drive',
  ) {
    this._outputCallback = outputCallback
    this._mountpoint = mountpoint;
    this._currentLine = ""
    this._environment = new Environment()
  }

  get environment(): Environment {
    return this._environment
  }

  async input(char: string): Promise<void> {
    // Might be a multi-char string if begins with escape code.
    const code = char.charCodeAt(0)
    //console.log("CODE", code)
    if (code == 13) {  // \r
      await this.output("\r\n")
      const cmdText = this._currentLine.trimStart()
      this._currentLine = ""
      await this._runCommands(cmdText)
      await this.output(this._environment.getPrompt())
    } else if (code == 127) {  // Backspace
      if (this._currentLine.length > 0) {
        this._currentLine = this._currentLine.slice(0, -1)
        const backspace = "\x1B[1D"
        await this.output(backspace + ' ' + backspace)
      }
    } else if (code == 9) {  // Tab \t
      const trimmedLine = this._currentLine.trimStart()
      if (trimmedLine.length == 0) {
        return
      }

      // This tab complete needs to be improved.
      const [offset, possibles] = await this._tabComplete(trimmedLine)
      if (possibles.length == 1) {
        const n = this._currentLine.length
        this._currentLine = this._currentLine + possibles[0].slice(offset) + " "
        await this.output(this._currentLine.slice(n))
      } else if (possibles.length > 1) {
        const line = possibles.join("  ")
        // Note keep leading whitespace on current line.
        await this.output(`\r\n${line}\r\n${this._environment.getPrompt()}${this._currentLine}`)
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

  async initFilesystem(): Promise<IFileSystem> {
    this._fsModule = await FsModule.default()
    const { FS, PATH, ERRNO_CODES, PROXYFS } = this._fsModule;
    FS.mkdir(this._mountpoint, 0o777)
    FS.chdir(this._mountpoint)
    this._environment.set("PWD", FS.cwd())
    this._fileSystem = { FS, PATH, ERRNO_CODES, PROXYFS }
    return this._fileSystem
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
    //this._env.set("COLUMNS", columns.toString())
    //this._env.set("LINES", rows.toString())
  }

  async start(): Promise<void> {
    await this.output(this._environment.getPrompt())
  }

  // Keeping this public for tests.
  async _runCommands(cmdText: string): Promise<void> {
    const stdout = new TerminalOutput(this._outputCallback)
    try {
      const cmdNodes = parse(cmdText)
      const ncmds = cmdNodes.length

      for (let i = 0; i < ncmds; ++i) {
        const command = cmdNodes[i] as CommandNode
        const cmdName = command.name.value

        const runner = CommandRegistry.instance().get(cmdName)
        if (runner === null) {
          // Give location of command in input?
          throw new Error(`Unknown command: '${cmdName}'`)
        }

        let output: Output = stdout
        if (command.redirects) {
          // Support single redirect only, write or append to file.
          if (command.redirects.length > 1) {
            throw new Error("Only implemented a single redirect per command")
          }
          const redirect = command.redirects[0]
          const redirectChars = redirect.token.value
          if (!(redirectChars == ">" || redirectChars == ">>")) {
            throw new Error("Only implemented redirect write to file, not " + redirectChars)
          }

          const path = redirect.target.value
          output = new FileOutput(this._fileSystem!, path, redirectChars == ">>")
        }

        const args = command.suffix.map((token) => token.value)
        const context = new Context(
          args, this._fileSystem!, this._mountpoint, this._environment, output,
        )
        await runner.run(cmdName, context)

        await context.flush()
      }
    } catch (error: any) {
      // Send result via output??????  With color.  Should be to stderr.
      stdout.write("\x1b[1;31m" + error + "\x1b[1;0m\r\n")
      await stdout.flush()
    }
  }

  private async _tabComplete(text: string): Promise<[number, string[]]> {
    // Assume tab completing command.
    return [text.length, CommandRegistry.instance().match(text)]
  }

  private readonly _outputCallback: IOutputCallback
  private _currentLine: string
  private _environment: Environment

  private _fsModule: any
  private _fileSystem?: IFileSystem
  private _mountpoint: string;
}
