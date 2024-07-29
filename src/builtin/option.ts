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

  set(): void {
    this._isSet = true;
  }

  protected _isSet: boolean = false;
}

export class BooleanOption extends Option {
  constructor(shortName: string, longName: string, description: string) {
    super(shortName, longName, description);
  }
}

// Greedily consumes all remaining options as strings.
// Often used for file/directory paths.
export class TrailingStringsOption extends Option {
  constructor(readonly minCount: number = 1) {
    super('', '', '');
    if (minCount < 0) {
      throw new GeneralError('Negative minCount in TrailingStringsOption.constructor');
    }
  }

  add(str: string) {
    this._strings.push(str);
    this._isSet = true;
  }

  get length(): number {
    return this._strings.length;
  }

  get strings(): string[] {
    return this._strings;
  }

  private _strings: string[] = [];
}
