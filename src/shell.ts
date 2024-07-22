import { Aliases } from "./aliases"
import { IOutputCallback, IEnableBufferedStdinCallback, IStdinCallback } from "./callback"
import { CommandRegistry } from "./command_registry"
import { Context } from "./context"
import { Environment } from "./environment"
import { IFileSystem } from "./file_system"
import { History } from "./history"
import { FileInput, FileOutput, IInput, IOutput, Pipe, TerminalInput, TerminalOutput } from "./io"
import { CommandNode, PipeNode, parse } from "./parse"
import * as FsModule from './wasm/fs'

export namespace IShell {
  export interface IOptions {
    mountpoint?: string
    outputCallback: IOutputCallback
    enableBufferedStdinCallback?: IEnableBufferedStdinCallback
    stdinCallback?: IStdinCallback
  }
}

export class Shell {
  constructor(options: IShell.IOptions) {
    this._outputCallback = options.outputCallback
    this._mountpoint = options.mountpoint ?? "/drive"
    this._enableBufferedStdinCallback = options.enableBufferedStdinCallback
    this._stdinCallback = options.stdinCallback
    this._currentLine = ""
    this._aliases = new Aliases()
    this._environment = new Environment()
    this._history = new History()
  }

  get aliases(): Aliases {
    return this._aliases
  }

  get environment(): Environment {
    return this._environment
  }

  get history(): History {
    return this._history
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
      if (remainder == "[A" || remainder == "[1A" ||  // Up arrow
          remainder == "[B" || remainder == "[1B") {  // Down arrow
        const cmdText = this._history.scrollCurrent(remainder.endsWith("B"))
        this._currentLine = cmdText !== null ? cmdText : ""
        // Re-output whole line.
        this.output(`\x1B[1K\r${this._environment.getPrompt()}${this._currentLine}`)
      }
    } else if (code == 4) {  // EOT, usually = Ctrl-D


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
    // Might be best to not have this as it implies each input fron frontend in a single char when
    // it can be multiple chars for escape sequences.
    for (let i = 0; i < chars.length; ++i) {
      await this.input(chars[i])
    }
  }

  async output(text: string): Promise<void> {
    await this._outputCallback(text)
  }

  async setSize(rows: number, columns: number): Promise<void> {
    const { environment } = this

    if (rows >= 1) {
      environment.set("LINES", rows.toString())
    } else {
      environment.delete("LINES")
    }

    if (columns >= 1) {
      environment.set("COLUMNS", columns.toString())
    } else {
      environment.delete("COLUMNS")
    }
  }

  async start(): Promise<void> {
    await this.output(this._environment.getPrompt())
  }

  // Keeping this public for tests.
  async _runCommands(cmdText: string): Promise<void> {
    if (this._enableBufferedStdinCallback) {
      this._enableBufferedStdinCallback(true)
    }

    if (cmdText.startsWith("!")) {
      // Get command from history and run that.
      const index = parseInt(cmdText.slice(1))
      const possibleCmd = this._history.at(index)
      if (possibleCmd === null) {
        await this.output("\x1b[1;31m!" + index + ": event not found\x1b[1;0m\r\n")
        await this.output(this._environment.getPrompt())
        return
      }
      cmdText = possibleCmd
    }

    this._history.add(cmdText)

    const stdin = new TerminalInput(this._stdinCallback)
    const stdout = new TerminalOutput(this._outputCallback)
    try {
      const nodes = parse(cmdText, this._aliases)

      for (const node of nodes) {
        if (node instanceof CommandNode) {
          await this._runCommand(node, stdin, stdout)
        } else if (node instanceof PipeNode) {
          const { commands } = node
          const n = commands.length
          let prevPipe: Pipe
          for (let i = 0; i < n; i++) {
            const input = i == 0 ? stdin : prevPipe!.input
            const output = i < n-1 ? (prevPipe = new Pipe()) : stdout
            await this._runCommand(commands[i], input, output)
          }
        } else {
          // This should not occur.
          throw new Error(`Expected CommandNode or PipeNode not ${node}`)
        }
      }
    } catch (error: any) {
      // Send result via output??????  With color.  Should be to stderr.
      stdout.write("\x1b[1;31m" + error + "\x1b[1;0m\r\n")
      await stdout.flush()
    } finally {
      if (this._enableBufferedStdinCallback) {
        this._enableBufferedStdinCallback(false)
      }
    }
  }

  private async _runCommand(
    commandNode: CommandNode,
    input: IInput,
    output: IOutput,
  ): Promise<void> {
    const name = commandNode.name.value
    const runner = CommandRegistry.instance().get(name)
    if (runner === null) {
      // Give location of command in input?
      throw new Error(`Unknown command: '${name}'`)
    }

    if (commandNode.redirects) {
      // Support single redirect only, write or append to file.
      if (commandNode.redirects.length > 1) {
        throw new Error("Only implemented a single redirect per command")
      }
      const redirect = commandNode.redirects[0]
      const redirectChars = redirect.token.value
      const path = redirect.target.value
      if (redirectChars == ">" || redirectChars == ">>") {
        output = new FileOutput(this._fileSystem!, path, redirectChars == ">>")
      } else if (redirectChars == "<") {
        input = new FileInput(this._fileSystem!, path)
      } else {
        throw new Error("Unrecognised redirect " + redirectChars)
      }
    }

    const args = commandNode.suffix.map((token) => token.value)
    const context = new Context(
      args, this._fileSystem!, this._mountpoint, this._aliases, this._environment, this._history,
      input, output,
    )
    await runner.run(name, context)

    await context.flush()
  }

  private async _tabComplete(text: string): Promise<[number, string[]]> {
    // Assume tab completing command.
    const commandMatches = CommandRegistry.instance().match(text)
    const aliasMatches = this._aliases.match(text)
    // Combine, removing duplicates, and sort.
    const matches = [...new Set([...commandMatches, ...aliasMatches])]
    return [text.length, matches]
  }

  private readonly _outputCallback: IOutputCallback
  private readonly _enableBufferedStdinCallback?: IEnableBufferedStdinCallback
  private readonly _stdinCallback?: IStdinCallback

  private _currentLine: string
  private _aliases: Aliases
  private _environment: Environment
  private _history: History

  private _fsModule: any
  private _fileSystem?: IFileSystem
  private _mountpoint: string;
}
