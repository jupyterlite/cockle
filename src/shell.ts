import { Aliases } from './aliases';
import { ansi } from './ansi';
import { IOutputCallback, IEnableBufferedStdinCallback, IStdinCallback } from './callback';
import { CommandRegistry } from './command_registry';
import { Context } from './context';
import { Environment } from './environment';
import { ErrorExitCode, FindCommandError, GeneralError } from './error_exit_code';
import { ExitCode } from './exit_code';
import { IFileSystem } from './file_system';
import { History } from './history';
import { FileInput, FileOutput, IInput, IOutput, Pipe, TerminalInput, TerminalOutput } from './io';
import { CommandNode, PipeNode, parse } from './parse';
import { longestStartsWith, toColumns } from './utils';
import * as FsModule from './wasm/fs';

export namespace IShell {
  export interface IOptions {
    mountpoint?: string;
    outputCallback: IOutputCallback;
    enableBufferedStdinCallback?: IEnableBufferedStdinCallback;
    stdinCallback?: IStdinCallback;
  }
}

export class Shell {
  constructor(options: IShell.IOptions) {
    this._outputCallback = options.outputCallback;
    this._mountpoint = options.mountpoint ?? '/drive';
    this._enableBufferedStdinCallback = options.enableBufferedStdinCallback;
    this._stdinCallback = options.stdinCallback;
    this._currentLine = '';
    this._cursorIndex = 0;
    this._aliases = new Aliases();
    this._environment = new Environment();
    this._history = new History();
  }

  get aliases(): Aliases {
    return this._aliases;
  }

  get environment(): Environment {
    return this._environment;
  }

  get history(): History {
    return this._history;
  }

  async input(char: string): Promise<void> {
    // Might be a multi-char string if begins with escape code.
    const code = char.charCodeAt(0);
    //console.log("CODE", code)
    if (code === 13) {
      // \r
      await this.output('\r\n');
      const cmdText = this._currentLine.trimStart();
      this._currentLine = '';
      this._cursorIndex = 0;
      await this._runCommands(cmdText);
      await this.output(this._environment.getPrompt());
    } else if (code === 127) {
      // Backspace
      if (this._cursorIndex > 0) {
        const suffix = this._currentLine.slice(this._cursorIndex);
        this._currentLine = this._currentLine.slice(0, this._cursorIndex - 1) + suffix;
        this._cursorIndex--;
        await this.output(
          ansi.cursorLeft(1) + suffix + ansi.eraseEndLine + ansi.cursorLeft(suffix.length)
        );
      }
    } else if (code === 9) {
      // Tab \t
      await this._tabComplete();
    } else if (code === 27) {
      // Escape following by 1+ more characters
      const remainder = char.slice(1);
      console.log('Escape code', char);
      if (
        remainder === '[A' || // Up arrow
        remainder === '[1A' ||
        remainder === '[B' || // Down arrow
        remainder === '[1B'
      ) {
        const cmdText = this._history.scrollCurrent(remainder.endsWith('B'));
        this._currentLine = cmdText !== null ? cmdText : '';
        this._cursorIndex = this._currentLine.length;
        // Re-output whole line.
        this.output(ansi.eraseStartLine + `\r${this._environment.getPrompt()}${this._currentLine}`);
      } else if (remainder === '[D' || remainder === '[1D') {
        // Left arrow
        if (this._cursorIndex > 0) {
          this._cursorIndex--;
          await this.output(ansi.cursorLeft());
        }
      } else if (remainder === '[C' || remainder === '[1C') {
        // Right arrow
        if (this._cursorIndex < this._currentLine.length) {
          this._cursorIndex++;
          await this.output(ansi.cursorRight());
        }
      } else if (remainder === '[3~') {
        // Delete
        if (this._cursorIndex < this._currentLine.length) {
          const suffix = this._currentLine.slice(this._cursorIndex + 1);
          this._currentLine = this._currentLine.slice(0, this._cursorIndex) + suffix;
          await this.output(ansi.eraseEndLine + suffix + ansi.cursorLeft(suffix.length));
        }
      } else if (remainder === '[H' || remainder === '[1;2H') {
        // Home
        if (this._cursorIndex > 0) {
          await this.output(ansi.cursorLeft(this._cursorIndex));
          this._cursorIndex = 0;
        }
      } else if (remainder === '[F' || remainder === '[1;2F') {
        // End
        const { length } = this._currentLine;
        if (this._cursorIndex < length) {
          await this.output(ansi.cursorRight(length - this._cursorIndex));
          this._cursorIndex = length;
        }
      } else if (remainder === '[1;2D' || remainder === '[1;5D') {
        // Start of previous word
        if (this._cursorIndex > 0) {
          const index =
            this._currentLine.slice(0, this._cursorIndex).trimEnd().lastIndexOf(' ') + 1;
          this.output(ansi.cursorLeft(this._cursorIndex - index));
          this._cursorIndex = index;
        }
      } else if (remainder === '[1;2C' || remainder === '[1;5C') {
        // End of next word
        const { length } = this._currentLine;
        if (this._cursorIndex < length - 1) {
          const end = this._currentLine.slice(this._cursorIndex);
          const trimmed = end.trimStart();
          const i = trimmed.indexOf(' ');
          const index = i < 0 ? length : this._cursorIndex + end.length - trimmed.length + i;
          this.output(ansi.cursorRight(index - this._cursorIndex));
          this._cursorIndex = index;
        }
      }
    } else if (code === 4) {
      // EOT, usually = Ctrl-D
    } else {
      // Add char to command line at cursor position.
      if (this._cursorIndex === this._currentLine.length) {
        // Append char.
        this._currentLine += char;
        await this.output(char);
      } else {
        // Insert char.
        const suffix = this._currentLine.slice(this._cursorIndex);
        this._currentLine = this._currentLine.slice(0, this._cursorIndex) + char + suffix;
        await this.output(ansi.eraseEndLine + char + suffix + ansi.cursorLeft(suffix.length));
      }
      this._cursorIndex++;
    }
  }

  async initFilesystem(): Promise<IFileSystem> {
    this._fsModule = await FsModule.default();
    const { FS, PATH, ERRNO_CODES, PROXYFS } = this._fsModule;
    FS.mkdir(this._mountpoint, 0o777);
    FS.chdir(this._mountpoint);
    this._environment.set('PWD', FS.cwd());
    this._fileSystem = { FS, PATH, ERRNO_CODES, PROXYFS };
    return this._fileSystem;
  }

  async inputs(chars: string[]): Promise<void> {
    // Might be best to not have this as it implies each input fron frontend in a single char when
    // it can be multiple chars for escape sequences.
    for (let i = 0; i < chars.length; ++i) {
      await this.input(chars[i]);
    }
  }

  async output(text: string): Promise<void> {
    await this._outputCallback(text);
  }

  async setSize(rows: number, columns: number): Promise<void> {
    const { environment } = this;

    if (rows >= 1) {
      environment.set('LINES', rows.toString());
    } else {
      environment.delete('LINES');
    }

    if (columns >= 1) {
      environment.set('COLUMNS', columns.toString());
    } else {
      environment.delete('COLUMNS');
    }
  }

  async start(): Promise<void> {
    await this.output(this._environment.getPrompt());
  }

  // Keeping this public for tests.
  async _runCommands(cmdText: string): Promise<void> {
    if (this._enableBufferedStdinCallback) {
      this._enableBufferedStdinCallback(true);
    }

    if (cmdText.startsWith('!')) {
      // Get command from history and run that.
      const index = parseInt(cmdText.slice(1));
      const possibleCmd = this._history.at(index);
      if (possibleCmd === null) {
        // Does not set exit code.
        await this.output(
          ansi.styleBoldRed + '!' + index + ': event not found' + ansi.styleReset + '\r\n'
        );
        await this.output(this._environment.getPrompt());
        return;
      }
      cmdText = possibleCmd;
    }

    this._history.add(cmdText);

    let exitCode!: number;
    const stdin = new TerminalInput(this._stdinCallback);
    const stdout = new TerminalOutput(this._outputCallback);
    const stderr = new TerminalOutput(this._outputCallback, ansi.styleBoldRed, ansi.styleReset);
    try {
      const nodes = parse(cmdText, true, this._aliases);

      for (const node of nodes) {
        if (node instanceof CommandNode) {
          exitCode = await this._runCommand(node, stdin, stdout, stderr);
        } else if (node instanceof PipeNode) {
          const { commands } = node;
          const n = commands.length;
          let prevPipe: Pipe;
          for (let i = 0; i < n; i++) {
            const input = i === 0 ? stdin : prevPipe!.input;
            const output = i < n - 1 ? (prevPipe = new Pipe()) : stdout;
            await this._runCommand(commands[i], input, output, stderr);
          }
        } else {
          // This should not occur.
          throw new GeneralError(`Expected CommandNode or PipeNode not ${node}`);
        }
      }
    } catch (error: any) {
      if (error instanceof ErrorExitCode) {
        exitCode = error.exitCode;
      }
      stderr.write(error + '\r\n');
      await stderr.flush();
    } finally {
      exitCode = exitCode ?? ExitCode.GENERAL_ERROR;
      this.environment.set('?', `${exitCode}`);

      if (this._enableBufferedStdinCallback) {
        this._enableBufferedStdinCallback(false);
      }
    }
  }

  private async _runCommand(
    commandNode: CommandNode,
    input: IInput,
    output: IOutput,
    error: IOutput
  ): Promise<number> {
    const name = commandNode.name.value;
    const runner = CommandRegistry.instance().get(name);
    if (runner === null) {
      // Give location of command in input?
      throw new FindCommandError(name);
    }

    if (commandNode.redirects) {
      // Support single redirect only, write or append to file.
      if (commandNode.redirects.length > 1) {
        throw new GeneralError('Only implemented a single redirect per command');
      }
      const redirect = commandNode.redirects[0];
      const redirectChars = redirect.token.value;
      const path = redirect.target.value;
      if (redirectChars === '>' || redirectChars === '>>') {
        output = new FileOutput(this._fileSystem!, path, redirectChars === '>>');
      } else if (redirectChars === '<') {
        input = new FileInput(this._fileSystem!, path);
      } else {
        throw new GeneralError('Unrecognised redirect ' + redirectChars);
      }
    }

    const args = commandNode.suffix.map(token => token.value);
    const context = new Context(
      args,
      this._fileSystem!,
      this._mountpoint,
      this._aliases,
      this._environment,
      this._history,
      input,
      output,
      error
    );
    const exitCode = await runner.run(name, context);

    await context.flush();
    return exitCode;
  }

  private async _tabComplete(): Promise<void> {
    const text = this._currentLine.slice(0, this._cursorIndex);
    if (text.endsWith(' ') && text.trim().length > 0) {
      return;
    }

    const suffix = this._currentLine.slice(this._cursorIndex);
    const parsed = parse(text, false);
    const [lastToken, isCommand] =
      parsed.length > 0 ? parsed[parsed.length - 1].lastToken() : [null, true];
    let lookup = lastToken?.value ?? '';

    let possibles: string[] = [];
    if (isCommand) {
      const commandMatches = CommandRegistry.instance().match(lookup);
      const aliasMatches = this._aliases.match(lookup);
      // Combine, removing duplicates, and sort.
      possibles = [...new Set([...commandMatches, ...aliasMatches])].sort();
    } else {
      // Is filename.
      const { FS } = this._fileSystem!;
      const analyze = FS.analyzePath(lookup, false);
      if (!analyze.parentExists) {
        return;
      }

      const initialLookup = lookup;
      lookup = analyze.name;
      const { exists } = analyze;
      if (exists && !FS.isDir(FS.stat(analyze.path).mode)) {
        // Exactly matches a filename.
        possibles = [lookup];
      } else {
        const lookupPath = exists ? analyze.path : analyze.parentPath;
        possibles = FS.readdir(lookupPath);

        if (exists) {
          const wantDot =
            initialLookup === '.' ||
            initialLookup === '..' ||
            initialLookup.endsWith('/.') ||
            initialLookup.endsWith('/..');
          if (wantDot) {
            possibles = possibles.filter((path: string) => path.startsWith('.'));
          } else {
            possibles = possibles.filter((path: string) => !path.startsWith('.'));
            if (!initialLookup.endsWith('/')) {
              this._currentLine += '/';
            }
          }
        } else {
          possibles = possibles.filter((path: string) => path.startsWith(lookup));
        }

        // Directories are displayed with appended /
        possibles = possibles.map((path: string) =>
          FS.isDir(FS.stat(lookupPath + '/' + path).mode) ? path + '/' : path
        );
      }
    }

    if (possibles.length === 1) {
      let extra = possibles[0].slice(lookup.length);
      if (!extra.endsWith('/')) {
        extra += ' ';
      }
      this._currentLine = this._currentLine.slice(0, this._cursorIndex) + extra + suffix;
      this._cursorIndex += extra.length;
      await this.output(extra + suffix + ansi.cursorLeft(suffix.length));
    } else if (possibles.length > 1) {
      // Multiple possibles.
      const startsWith = longestStartsWith(possibles, lookup.length);
      if (startsWith.length > lookup.length) {
        // Complete up to the longest common startsWith.
        const extra = startsWith.slice(lookup.length);
        this._currentLine = this._currentLine.slice(0, this._cursorIndex) + extra + suffix;
        this._cursorIndex += extra.length;
        await this.output(extra + suffix + ansi.cursorLeft(suffix.length));
      } else {
        // Write all the possibles in columns across the terminal.
        const lines = toColumns(possibles, this._environment.getNumber('COLUMNS') ?? 0);
        const output = `\r\n${lines.join('\r\n')}\r\n${this._environment.getPrompt()}${this._currentLine}`;
        await this.output(output + ansi.cursorLeft(suffix.length));
      }
    }
  }

  private readonly _outputCallback: IOutputCallback;
  private readonly _enableBufferedStdinCallback?: IEnableBufferedStdinCallback;
  private readonly _stdinCallback?: IStdinCallback;

  private _currentLine: string;
  private _cursorIndex: number;
  private _aliases: Aliases;
  private _environment: Environment;
  private _history: History;

  private _fsModule: any;
  private _fileSystem?: IFileSystem;
  private _mountpoint: string;
}
