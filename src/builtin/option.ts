import { GeneralError } from '../error_exit_code';

export abstract class Option {
  constructor(
    readonly shortName: string,
    readonly longName: string,
    readonly description: string
  ) {}

  get isSet(): boolean {
    return this._isSet;
  }

  get name(): string {
    return this.shortName ? this.shortName : this.longName;
  }

  get prefixedName(): string {
    return this.shortName ? `-${this.shortName}` : `--${this.longName}`;
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

export class BooleanOption extends Option {
  constructor(shortName: string, longName: string, description: string) {
    super(shortName, longName, description);
  }
}

export class OptionalStringOption extends BooleanOption {
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

// Greedily consumes all remaining options as strings.
// Often used for file/directory paths.
export class TrailingStringsOption extends Option {
  constructor(readonly options: TrailingStringsOption.IOptions = {}) {
    super('', '', '');
    if (options.min !== undefined && options.min < 0) {
      throw new GeneralError('Negative min in TrailingStringsOption.constructor');
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
        throw new GeneralError('Cannot have named option after parsing a trailing path');
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

export class TrailingPathsOption extends TrailingStringsOption {
  constructor(readonly options: TrailingPathsOption.IOptions = {}) {
    super(options);
  }
}

export namespace TrailingStringsOption {
  export interface IOptions {
    min?: number;
  }
}

export namespace TrailingPathsOption {
  export interface IOptions extends TrailingStringsOption.IOptions {}
}
