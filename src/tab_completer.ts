import { ansi } from './ansi';
import { ICommandLine } from './command_line';
import { IRunContext } from './context';
import { CommandNode, parse } from './parse';
import { ITabCompleteResult, PathType } from './tab_complete';
import { RuntimeExports } from './types/wasm_module';
import { longestStartsWith, toColumns } from './utils';

export class TabCompleter {
  constructor(readonly context: IRunContext) {}

  async complete(commandLine: ICommandLine): Promise<ICommandLine> {
    const text = commandLine.text.slice(0, commandLine.cursorIndex);
    const suffix = commandLine.text.slice(commandLine.cursorIndex);

    const parsed = parse(text, false);
    const lastParsedNode = parsed.at(-1); // Deal with multiple commands in commandLine.
    const [lastToken, isCommand] = text.endsWith(' ')
      ? [null, false]
      : lastParsedNode !== undefined
        ? lastParsedNode.lastToken()
        : [null, true];
    let tokenToComplete = lastToken?.value ?? '';

    // Get possible matches, default is to match path.
    let tabCompleteResult: ITabCompleteResult = { pathType: PathType.Any };
    if (isCommand) {
      tabCompleteResult = { possibles: this._getPossibleCompletionsCommand(tokenToComplete) };
    } else if (lastParsedNode instanceof CommandNode) {
      const commandNode = lastParsedNode as CommandNode;
      const name = commandNode.name.value;
      const runner = this.context.commandRegistry.get(name);
      if (runner !== null && runner.tabComplete !== undefined) {
        const args = commandNode.suffix.map(token => token.value);
        if (!tokenToComplete) {
          args.push('');
        }
        const { commandRegistry, stdinContext } = this.context;
        tabCompleteResult = await runner.tabComplete({
          name,
          args,
          commandRegistry,
          shellId: this.context.shellId,
          stdinContext
        });
      }
    }

    const possibles = tabCompleteResult.possibles ?? [];
    if (tabCompleteResult.pathType !== undefined) {
      // FileSystem matches are special as slashes can modify commandLine and tokenToComplete.
      let pathPossibles: string[] = [];
      [commandLine, tokenToComplete, pathPossibles] = this._getPossibleCompletionsFileSystem(
        commandLine,
        tokenToComplete,
        tabCompleteResult.pathType
      );
      possibles.push(...pathPossibles);
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
    tokenToComplete: string,
    pathType: PathType
  ): [ICommandLine, string, string[]] {
    // Need to support restricting to only files and only directories.
    const { FS, PATH } = this.context.fileSystem;

    if (!tokenToComplete) {
      // If tokenToComplete is empty, want all possibles in cwd.
      tokenToComplete = './';
    }

    const endsWithSlash = tokenToComplete.endsWith('/');
    const prev = [undefined, '/'];
    const doubleDot = tokenToComplete.endsWith('..') && prev.includes(tokenToComplete.at(-3));
    const singleDot =
      !doubleDot && tokenToComplete.endsWith('.') && prev.includes(tokenToComplete.at(-2));
    const isDot = singleDot || doubleDot;

    if (doubleDot) {
      // Remove final dot for analyzePath otherwise it returns the parent directory.
      tokenToComplete = tokenToComplete.slice(0, -1);
    }

    // Obtain parentPath and prefix (start of filename to match in parentPath)
    const analyze = FS.analyzePath(tokenToComplete, true);
    const parentPath: string = endsWithSlash || isDot ? analyze.path : analyze.parentPath;
    const prefix: string = isDot ? (singleDot ? '.' : '..') : endsWithSlash ? '' : analyze.name;

    // Get all files/directories in parentPath.
    let possibles: string[] = FS.readdir(parentPath);

    if (endsWithSlash) {
      // Exclude possibles starting with .
      possibles = possibles.filter((path: string) => !path.startsWith('.'));
    }

    // Filter for correct string prefix
    possibles = possibles.filter((path: string) => path.startsWith(prefix));

    const fsCache = new FSCache(FS);

    // Filter by file/directory type.
    if (pathType === PathType.Directory) {
      possibles = possibles.filter(path => fsCache.isDir(PATH.join(parentPath, path)));
    } else if (pathType === PathType.File) {
      possibles = possibles.filter(path => fsCache.isFile(PATH.join(parentPath, path)));
    }

    if (pathType !== PathType.File) {
      // Directories are displayed with appended /
      possibles = possibles.map((path: string) =>
        fsCache.isDir(PATH.join(parentPath, path)) ? path + '/' : path
      );
    }

    // Replate tokenToComplete with prefix, so that parent directories are removed.
    return [commandLine, prefix, possibles];
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

/**
 * Short-term cache for FS stat information, assumes file system is read-only so cache is not
 * necessarily valid if a file/directory is modified.
 * Only used in TabCompleter, but may be of use elsewhere.
 * TODO: need type info for FS.stat return.
 */
class FSCache {
  constructor(readonly FS: typeof RuntimeExports.FS) {}

  isDir(fullPath: string): boolean {
    return this.FS.isDir(this._stat(fullPath).mode);
  }

  isFile(fullPath: string): boolean {
    return this.FS.isFile(this._stat(fullPath).mode);
  }

  private _stat(fullPath: string): any {
    let stat = this._statCache.get(fullPath);
    if (stat === undefined) {
      stat = this.FS.stat(fullPath, false);
      this._statCache.set(fullPath, stat);
    }
    return stat;
  }

  private _statCache = new Map<string, any>();
}
