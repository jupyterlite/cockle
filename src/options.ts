/**
 * A collection of options for a builtin command.
 */
import { ITabCompleteContext } from './context';
import { GeneralError } from './error_exit_code';
import { IOutput } from './io';
import { Option, TrailingPathsOption, TrailingStringsOption } from './option';
import { ITabCompleteResult, PathMatch } from './tab_complete';

export abstract class Options {
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

  //  private _findByLongName<T extends Options>(longName: string): Option {
  private _findByLongName(longName: string): Option {
    const longNameOptions = this._longNameOptions;
    if (longName in longNameOptions) {
      return longNameOptions[longName];
    } else {
      // Need better error reporting
      throw new GeneralError(`No such longName option '${longName}'`);
    }
  }

  //  private _findByShortName<T extends Options>(shortName: string): Option {
  private _findByShortName(shortName: string): Option {
    const shortNameOptions = this._shortNameOptions;
    if (shortName in shortNameOptions) {
      return shortNameOptions[shortName];
    } else {
      // Need better error reporting
      throw new GeneralError(`No such shortName option '${shortName}'`);
    }
  }

  private _getStrings(): TrailingStringsOption | null {
    if ('trailingPaths' in this) {
      return this['trailingPaths'] as TrailingStringsOption;
    } else if ('trailingStrings' in this) {
      return this['trailingStrings'] as TrailingStringsOption;
    } else {
      return null;
    }
  }

  private *_help(): Generator<string> {
    // Dynamically create help text from options.
    for (const [key, option] of Object.entries(this)) {
      if (key === 'subcommands') {
        break;
      }
      const name = option.prefixedName;
      const spaces = Math.max(1, 12 - name.length);
      yield `    ${name}${' '.repeat(spaces)}${option.description}`;
    }

    if ('subcommands' in this) {
      const subcommands = this['subcommands'] as object;
      yield '';
      yield 'subcommands:';
      for (const sub of Object.values(subcommands)) {
        const spaces = Math.max(1, 12 - sub.name.length);
        yield `    ${sub.name}${' '.repeat(spaces)}${sub.description}`;
      }
    }
  }

  private get _longNameOptions(): { [longName: string]: Option } {
    const options = Object.values(this).filter(
      opt => opt instanceof Option && 'longName' in opt && opt.longName.length > 0
    );
    return Object.fromEntries(options.map(opt => [opt.longName, opt]));
  }

  /**
   * Parse arguments to run a command.
   */
  private _parseToRun(args: string[]): void {
    const trailingStrings = this._getStrings();
    let inTrailingStrings = false;

    const subcommands: { [key: string]: Subcommand } = (this as any).subcommands ?? {};
    let firstArg = true;

    while (args.length > 0) {
      const arg = args.shift()!;

      if (firstArg && arg in subcommands) {
        const subcommand = subcommands[arg];
        subcommand.set();
        subcommand.parse(args);
        break;
      } else if (arg.startsWith('-') && arg.length > 1) {
        if (inTrailingStrings) {
          throw new GeneralError('Cannot have named option after parsing a trailing path');
        }
        if (arg.startsWith('--')) {
          const longName = arg.slice(2);
          args = this._findByLongName(longName).parse(arg, args);
        } else {
          const shortName = arg.slice(1);
          args = this._findByShortName(shortName).parse(arg, args);
        }
      } else if (trailingStrings !== null) {
        inTrailingStrings = true;
        args = trailingStrings.parse(arg, args);
      } else {
        throw new GeneralError(`Unrecognised option: '${arg}'`);
      }

      firstArg = false;
    }

    if (trailingStrings) {
      const { min, max } = trailingStrings.options;
      if (min !== undefined && trailingStrings.length < min) {
        throw new GeneralError('Insufficient trailing strings options specified');
      }
      if (max !== undefined && trailingStrings.length > max) {
        throw new GeneralError('Too many trailing strings options specified');
      }
    }
  }

  /**
   * Parse arguments to tab complete the final one.
   */
  private async _parseToTabComplete(context: ITabCompleteContext): Promise<ITabCompleteResult> {
    const { args } = context;
    const trailingStrings = this._getStrings();
    const subcommands: { [key: string]: Subcommand } = (this as any).subcommands ?? {};
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
          const longNamePossibles = Object.keys(this._longNameOptions).map(x => '--' + x);
          if (arg.startsWith('--')) {
            return { possibles: longNamePossibles };
          } else {
            const shortNamePossibles = Object.keys(this._shortNameOptions).map(x => '-' + x);
            return { possibles: shortNamePossibles.concat(longNamePossibles) };
          }
        } else {
          // Not final arg so parse as usual.
          // In fact just ignore it, which is no good if it wants to consume further args.
        }
      } else if (trailingStrings !== null) {
        // Jump straight to last argument as the preceding ones are independent of it.
        if (trailingStrings instanceof TrailingPathsOption) {
          return { pathMatch: trailingStrings.options.pathMatch ?? PathMatch.Any };
        } else {
          const possiblesCallback = trailingStrings.options.possibles;
          if (possiblesCallback !== undefined) {
            return { possibles: possiblesCallback({ ...context, args: [arg, ...args] }) };
          }
        }
      }

      firstArg = false;
    }

    return {};
  }

  private get _shortNameOptions(): { [shortName: string]: Option } {
    const options = Object.values(this).filter(
      opt => opt instanceof Option && 'shortName' in opt && opt.shortName.length > 0
    );
    return Object.fromEntries(options.map(opt => [opt.shortName, opt]));
  }
}

export class Subcommand extends Options {
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
