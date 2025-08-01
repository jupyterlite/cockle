import { Argument, PositionalArguments, PositionalPathArguments } from './argument';
import { ITabCompleteContext } from './context';
import { GeneralError } from './error_exit_code';
import { IOutput } from './io';
import { ITabCompleteResult, PathType } from './tab_complete';

/**
 * Arguments for a command, used by builtin, external and javascript commands.
 */
export abstract class CommandArguments {
  parse(args: string[]): this {
    // Use copy of args to avoid modifying caller's args.
    this._parseToRun(args.slice());
    return this;
  }

  async tabComplete(context: ITabCompleteContext): Promise<ITabCompleteResult> {
    // Use copy of args to avoid modifying caller's args.
    const contextWithArgsCopy = {
      ...context,
      args: context.args.slice()
    };

    const result = await this._parseToTabComplete(contextWithArgsCopy);
    if (result.possibles) {
      result.possibles = result.possibles.filter(name => name.startsWith(context.args.at(-1)!));
    }
    return result;
  }

  writeHelp(output: IOutput): void {
    for (const line of this._help()) {
      output.write(`${line}\n`);
    }
  }

  private _findByLongName(longName: string): Argument {
    const longNameArguments = this._longNameArguments;
    if (longName in longNameArguments) {
      return longNameArguments[longName];
    } else {
      // Need better error reporting
      throw new GeneralError(`No such longName argument '${longName}'`);
    }
  }

  private _findByShortName(shortName: string): Argument {
    const shortNameArguments = this._shortNameArguments;
    if (shortName in shortNameArguments) {
      return shortNameArguments[shortName];
    } else {
      // Need better error reporting
      throw new GeneralError(`No such shortName argument '${shortName}'`);
    }
  }

  private *_help(): Generator<string> {
    // Dynamically create help text from arguments.
    for (const arg of Object.values(this)) {
      if (arg instanceof Argument) {
        const name = arg.prefixedName;
        const spaces = Math.max(1, 12 - name.length);
        yield `    ${name}${' '.repeat(spaces)}${arg.description}`;
      }
    }

    const { subcommands } = this;
    if (subcommands !== undefined) {
      yield '';
      yield 'subcommands:';
      for (const sub of Object.values(subcommands)) {
        const spaces = Math.max(1, 12 - sub.name.length);
        yield `    ${sub.name}${' '.repeat(spaces)}${sub.description}`;
      }
    }
  }

  private get _longNameArguments(): { [longName: string]: Argument } {
    const args = Object.values(this).filter(
      arg => arg instanceof Argument && 'longName' in arg && arg.longName.length > 0
    );
    return Object.fromEntries(args.map(arg => [arg.longName, arg]));
  }

  /**
   * Parse arguments to run a command.
   */
  private _parseToRun(args: string[]): void {
    const { positional } = this;
    let inPositional = false;

    const subcommands = this.subcommands ?? {};
    let firstArg = true;

    while (args.length > 0) {
      const arg = args.shift()!;

      if (firstArg && arg in subcommands) {
        const subcommand = subcommands[arg];
        subcommand.set();
        subcommand.parse(args);
        break;
      } else if (arg.startsWith('-') && arg.length > 1) {
        if (inPositional) {
          throw new GeneralError('Cannot have named argument after positional arguments');
        }
        if (arg.startsWith('--')) {
          const longName = arg.slice(2);
          args = this._findByLongName(longName).parse(arg, args);
        } else {
          const shortName = arg.slice(1);
          args = this._findByShortName(shortName).parse(arg, args);
        }
      } else if (positional !== undefined) {
        inPositional = true;
        args = positional.parse(arg, args);
      } else {
        throw new GeneralError(`Unrecognised argument: '${arg}'`);
      }

      firstArg = false;
    }

    if (positional !== undefined) {
      // `positional` should handle its own validation here.
      const { min, max } = positional.options;
      if (min !== undefined && positional.length < min) {
        throw new GeneralError('Insufficient positional arguments');
      }
      if (max !== undefined && positional.length > max) {
        throw new GeneralError('Too many positional arguments');
      }
    }
  }

  /**
   * Parse arguments to tab complete the final one.
   */
  private async _parseToTabComplete(context: ITabCompleteContext): Promise<ITabCompleteResult> {
    const { args } = context;
    const { positional } = this;
    const subcommands = this.subcommands ?? {};
    let firstArg = true;

    while (args.length > 0) {
      const arg = args.shift()!;
      const lastArg = args.length === 0;

      if (firstArg && subcommands) {
        if (lastArg) {
          const possibles = Object.keys(subcommands).filter(name => name.startsWith(arg));
          if (possibles.length > 0) {
            return { possibles };
          }
        }

        if (arg in subcommands) {
          // Exact match, parse it.
          const subcommand = subcommands[arg];
          subcommand.set();
          return subcommand._parseToTabComplete({ ...context, args: [arg, ...args] });
        }
      }

      if (arg.startsWith('-')) {
        if (lastArg) {
          const longNamePossibles = Object.keys(this._longNameArguments).map(x => '--' + x);
          if (arg.startsWith('--')) {
            return { possibles: longNamePossibles };
          } else {
            const shortNamePossibles = Object.keys(this._shortNameArguments).map(x => '-' + x);
            return { possibles: shortNamePossibles.concat(longNamePossibles) };
          }
        } else {
          // Not final arg so parse as usual.
          // In fact just ignore it, which is no good if it wants to consume further args.
        }
      } else if (positional !== undefined) {
        // Jump straight to last argument as the preceding ones are independent of it.
        if (positional instanceof PositionalPathArguments) {
          return { pathType: positional.options.pathType ?? PathType.Any };
        } else {
          const possiblesCallback = positional.options.possibles;
          if (possiblesCallback !== undefined) {
            return { possibles: possiblesCallback({ ...context, args: [arg, ...args] }) };
          }
        }
      }

      firstArg = false;
    }

    return {};
  }

  private get _shortNameArguments(): { [shortName: string]: Argument } {
    const args = Object.values(this).filter(
      arg => arg instanceof Argument && 'shortName' in arg && arg.shortName.length > 0
    );
    return Object.fromEntries(args.map(arg => [arg.shortName, arg]));
  }

  positional?: PositionalArguments;
  subcommands?: { [key: string]: SubcommandArguments };
}

/**
 * Arguments for a subcommand, used by builtin, external and javascript commands.
 */
export class SubcommandArguments extends CommandArguments {
  constructor(
    readonly name: string,
    readonly description: string
  ) {
    super();
  }

  get isSet(): boolean {
    return this._isSet;
  }

  set() {
    this._isSet = true;
  }

  private _isSet = false;
}
