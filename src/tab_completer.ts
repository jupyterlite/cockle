import { ansi } from './ansi';
import { ICommandLine } from './command_line';
import { IContext } from './context';
import { parse } from './parse';
import { longestStartsWith, toColumns } from './utils';

export class TabCompleter {
  constructor(readonly context: IContext) {}

  async complete(commandLine: ICommandLine): Promise<ICommandLine> {
    const text = commandLine.text.slice(0, commandLine.cursorIndex);
    if (text.endsWith(' ') && text.trim().length > 0) {
      return commandLine;
    }

    const parsed = parse(text, false);
    const [lastToken, isCommand] =
      parsed.length > 0 ? parsed[parsed.length - 1].lastToken() : [null, true];
    let tokenToComplete = lastToken?.value ?? '';
    const suffix = commandLine.text.slice(commandLine.cursorIndex);

    // Get possible matches.
    let possibles: string[] = [];
    if (isCommand) {
      possibles = this._getPossibleCompletionsCommand(tokenToComplete);
    } else {
      // FileSystem matches are special as slashes can modify commandLine and tokenToComplete.
      [commandLine, tokenToComplete, possibles] = this._getPossibleCompletionsFileSystem(
        commandLine,
        tokenToComplete
      );
    }

    if (possibles.length === 0) {
      return commandLine;
    }

    possibles.sort();

    // If a single possible match, complete using it.
    if (possibles.length === 1) {
      let extra = possibles[0].slice(tokenToComplete.length);
      if (!extra.endsWith('/')) {
        extra += ' ';
      }
      commandLine.text = commandLine.text.slice(0, commandLine.cursorIndex) + extra + suffix;
      commandLine.cursorIndex += extra.length;
      this.context.workerIO.write(extra + suffix + ansi.cursorLeft(suffix.length));
      return commandLine;
    }

    // If all the possible matches start with the same text that is longer than the tokenToMatch,
    // complete up to that,
    const startsWith = longestStartsWith(possibles, tokenToComplete.length);
    if (startsWith.length > tokenToComplete.length) {
      const extra = startsWith.slice(tokenToComplete.length);
      commandLine.text = commandLine.text.slice(0, commandLine.cursorIndex) + extra + suffix;
      commandLine.cursorIndex += extra.length;
      this.context.workerIO.write(extra + suffix + ansi.cursorLeft(suffix.length));
      return commandLine;
    }

    await this._showPossibleCompletions(commandLine, suffix, possibles);
    return commandLine;
  }

  private _getPossibleCompletionsCommand(tokenToComplete: string): string[] {
    const commandMatches = this.context.commandRegistry.match(tokenToComplete);
    const aliasMatches = this.context.aliases.match(tokenToComplete);
    // Combine, removing duplicates.
    return [...new Set([...commandMatches, ...aliasMatches])];
  }

  private _getPossibleCompletionsFileSystem(
    commandLine: ICommandLine,
    tokenToComplete: string
  ): [ICommandLine, string, string[]] {
    // Need to support restricting to only files and only directories.
    const { FS } = this.context.fileSystem;
    const analyze = FS.analyzePath(tokenToComplete, false);
    if (!analyze.parentExists) {
      return [commandLine, tokenToComplete, []];
    }

    const initialLookup = tokenToComplete;
    tokenToComplete = analyze.name; // Drop parent directories in possible matches.
    const { exists } = analyze;
    if (exists && !FS.isDir(FS.stat(analyze.path, false).mode)) {
      // Exactly matches a filename.
      return [commandLine, tokenToComplete, [tokenToComplete]];
    }

    const lookupPath = exists ? analyze.path : analyze.parentPath;
    let possibles: string[] = FS.readdir(lookupPath);

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
          commandLine.text += '/';
        }
      }
    } else {
      possibles = possibles.filter((path: string) => path.startsWith(tokenToComplete));
    }

    // Directories are displayed with appended /
    possibles = possibles.map((path: string) =>
      FS.isDir(FS.stat(lookupPath + '/' + path, false).mode) ? path + '/' : path
    );

    return [commandLine, tokenToComplete, possibles];
  }

  private async _showPossibleCompletions(
    commandLine: ICommandLine,
    suffix: string,
    possibles: string[]
  ): Promise<void> {
    // Write all the possibles in columns across the terminal, and re-output the same command line.
    const { environment } = this.context;
    const lines = toColumns(possibles, environment.getNumber('COLUMNS') ?? 0);
    const output = `\n${lines.join('\n')}\n${environment.getPrompt()}${commandLine.text}`;
    this.context.workerIO.write(output + ansi.cursorLeft(suffix.length));
  }
}
