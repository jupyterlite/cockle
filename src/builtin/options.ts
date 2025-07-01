/**
 * A collection of options for a builtin command.
 */
import { Option, TrailingStringsOption } from './option';
import { GeneralError } from '../error_exit_code';
import { IOutput } from '../io';

export abstract class Options {
  parse(args: string[]): this {
    // Use copy of args to avoid modifying caller's args.
    let localArgs = args.slice();

    const trailingStrings = this._getStrings();
    const inTrailingStrings = false;

    const subcommands: { [key: string]: Subcommand } = (this as any).subcommands ?? {};
    let firstArg = true;

    while (localArgs.length > 0) {
      const arg = localArgs.shift()!;

      if (firstArg && arg in subcommands) {
        const subcommand = subcommands[arg];
        subcommand.set();
        subcommand.parse(localArgs);
        break;
      } else if (arg.startsWith('-') && arg.length > 1) {
        if (inTrailingStrings) {
          throw new GeneralError('Cannot have named option after parsing a trailing path');
        }
        if (arg.startsWith('--')) {
          const longName = arg.slice(2);
          localArgs = this._findByLongName(longName).parse(arg, localArgs);
        } else {
          const shortName = arg.slice(1);
          localArgs = this._findByShortName(shortName).parse(arg, localArgs);
        }
      } else if (trailingStrings !== null) {
        localArgs = trailingStrings.parse(arg, localArgs);
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

    return this;
  }

  writeHelp(output: IOutput): void {
    for (const line of this._help()) {
      output.write(`${line}\n`);
    }
  }

  //  private _findByLongName<T extends Options>(longName: string): Option {
  private _findByLongName(longName: string): Option {
    let v: Option;
    for (v of Object.values(this)) {
      if (v.longName === longName) {
        return v;
      }
    }
    // Need better error reporting
    throw new GeneralError(`No such longName option '${longName}'`);
  }

  //  private _findByShortName<T extends Options>(shortName: string): Option {
  private _findByShortName(shortName: string): Option {
    let v: Option;
    for (v of Object.values(this)) {
      if (v.shortName === shortName) {
        return v;
      }
    }
    // Need better error reporting
    throw new GeneralError(`No such shortName option '${shortName}'`);
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
