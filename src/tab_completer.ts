import { ansi } from './ansi';
import { ICommandLine } from './command_line';
import { IContext } from './context';
import { parse } from './parse';
import { longestStartsWith, toColumns } from './utils';

export class TabCompleter {
  constructor(readonly context: IContext) {}

  async complete(command_line: ICommandLine): Promise<ICommandLine> {
    const text = command_line.text.slice(0, command_line.cursorIndex);
    if (text.endsWith(' ') && text.trim().length > 0) {
      return command_line;
    }

    const suffix = command_line.text.slice(command_line.cursorIndex);
    const parsed = parse(text, false);
    const [lastToken, isCommand] =
      parsed.length > 0 ? parsed[parsed.length - 1].lastToken() : [null, true];
    let lookup = lastToken?.value ?? '';

    let possibles: string[] = [];
    if (isCommand) {
      const commandMatches = this.context.commandRegistry.match(lookup);
      const aliasMatches = this.context.aliases.match(lookup);
      // Combine, removing duplicates, and sort.
      possibles = [...new Set([...commandMatches, ...aliasMatches])].sort();
    } else {
      // Is filename.
      const { FS } = this.context.fileSystem;
      const analyze = FS.analyzePath(lookup, false);
      if (!analyze.parentExists) {
        return command_line;
      }

      const initialLookup = lookup;
      lookup = analyze.name;
      const { exists } = analyze;
      if (exists && !FS.isDir(FS.stat(analyze.path, false).mode)) {
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
              command_line.text += '/';
            }
          }
        } else {
          possibles = possibles.filter((path: string) => path.startsWith(lookup));
        }

        // Directories are displayed with appended /
        possibles = possibles.map((path: string) =>
          FS.isDir(FS.stat(lookupPath + '/' + path, false).mode) ? path + '/' : path
        );
      }
    }

    // Show possible completions.
    if (possibles.length === 1) {
      let extra = possibles[0].slice(lookup.length);
      if (!extra.endsWith('/')) {
        extra += ' ';
      }
      command_line.text = command_line.text.slice(0, command_line.cursorIndex) + extra + suffix;
      command_line.cursorIndex += extra.length;
      this.context.workerIO.write(extra + suffix + ansi.cursorLeft(suffix.length));
    } else if (possibles.length > 1) {
      // Multiple possibles.
      const startsWith = longestStartsWith(possibles, lookup.length);
      if (startsWith.length > lookup.length) {
        // Complete up to the longest common startsWith.
        const extra = startsWith.slice(lookup.length);
        command_line.text = command_line.text.slice(0, command_line.cursorIndex) + extra + suffix;
        command_line.cursorIndex += extra.length;
        this.context.workerIO.write(extra + suffix + ansi.cursorLeft(suffix.length));
      } else {
        // Write all the possibles in columns across the terminal.
        const { environment } = this.context;
        const lines = toColumns(possibles, environment.getNumber('COLUMNS') ?? 0);
        const output = `\n${lines.join('\n')}\n${environment.getPrompt()}${command_line.text}`;
        this.context.workerIO.write(output + ansi.cursorLeft(suffix.length));
      }
    }

    return command_line;
  }
}
