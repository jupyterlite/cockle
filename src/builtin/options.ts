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

    while (localArgs.length > 0) {
      const arg = localArgs.shift()!;

      if (arg.startsWith('-') && arg.length > 1) {
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
    }

    if (trailingStrings && trailingStrings.length < trailingStrings.minCount) {
      throw new GeneralError('Insufficient trailing strings options specified');
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
    if ('trailingStrings' in this) {
      return this['trailingStrings'] as TrailingStringsOption;
    } else {
      return null;
    }
  }

  private _help(): string[] {
    // Dynamically create help text from options.
    const sorted = [...Object.values(this)].sort((a, b) => (a.name > b.name ? 1 : -1));
    return sorted.map(option => {
      const name = option.prefixedName;
      const spaces = Math.max(1, 12 - name.length);
      return `    ${name}${' '.repeat(spaces)}${option.description}`;
    });
  }
}
