/**
 * Individual command argument classes.
 */

import { ITabCompleteContext } from './context';
import { GeneralError } from './error_exit_code';
import { ITabCompleteResult, PathType } from './tab_complete';

export abstract class Argument {
  constructor(
    readonly shortName: string,
    readonly longName: string,
    readonly description: string
  ) {
    if (!(shortName.length === 0 || shortName.length === 1)) {
      throw new GeneralError(`Argument shortName ${shortName} must be a string of length 1`);
    }
    if (!(longName.length === 0 || longName.length > 1)) {
      throw new GeneralError(
        `Argument longName ${longName} must be a string of length greater than 1`
      );
    }
  }

  get isSet(): boolean {
    return this._isSet;
  }

  /**
   * Parse remaining args and return those args not consumed.
   */
  parse(currentArg: string, args: string[]): string[] {
    this.set();
    return args;
  }

  protected set(): void {
    this._isSet = true;
  }

  protected _isSet: boolean = false;
}

export class BooleanArgument extends Argument {
  constructor(shortName: string, longName: string, description: string) {
    super(shortName, longName, description);
  }
}

export class OptionalStringArgument extends BooleanArgument {
  constructor(shortName: string, longName: string, description: string) {
    super(shortName, longName, description);
  }

  get string(): string | undefined {
    return this._string;
  }

  override parse(currentArg: string, args: string[]): string[] {
    this.set();
    if (args.length > 0 && !args[0].startsWith('-')) {
      this._string = args.shift();
    }
    return args;
  }

  private _string?: string;
}

/**
 * A collection of position arguments.
 * Greedily consumes all remaining arguments as strings.
 */
export class PositionalArguments extends Argument {
  constructor(readonly options: PositionalArguments.IOptions = {}) {
    super('', '', '');
    const { max, min } = options;
    if (min !== undefined) {
      if (min < 0) {
        throw new GeneralError('Negative min for positional arguments');
      }
      if (max !== undefined && max < min) {
        throw new GeneralError('max must be greater than min for positional arguments');
      }
    }
  }

  get length(): number {
    return this._strings.length;
  }

  /**
   * Parse remaining args. This will consume all the args, throwing an error if there are any args
   * of an incorrect form.
   */
  override parse(currentArg: string, args: string[]): string[] {
    this._strings.push(currentArg);
    this.set();

    for (const arg of args) {
      if (arg.startsWith('-')) {
        throw new GeneralError('Cannot have named argument after positional arguments');
      }
      this._strings.push(arg);
    }

    return [];
  }

  get strings(): string[] {
    return this._strings;
  }

  private _strings: string[] = [];
}

export class PositionalPathArguments extends PositionalArguments {
  constructor(readonly options: PositionalPathArguments.IOptions = {}) {
    super(options);
  }
}

export namespace PositionalArguments {
  export interface IOptions {
    min?: number;
    max?: number;

    /**
     * Function to return possible matches for tab completion.
     * The token for completion is context.args.at(-1) as it may be an empty string.
     * The possibles are subsequently filtered using startsWith(token-for-completion).
     */
    tabComplete?: (context: ITabCompleteContext) => Promise<ITabCompleteResult>;
  }
}

export namespace PositionalPathArguments {
  export interface IOptions extends PositionalArguments.IOptions {
    pathType?: PathType;
  }
}
