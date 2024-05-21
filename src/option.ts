export abstract class Option {
  constructor(
    readonly shortName: string,
    readonly longName: string,
    readonly description: string,
  ) {}

  get isSet(): boolean {
    return this._isSet
  }

  set(): void {
    this._isSet = true
  }

  private _isSet: boolean = false
}

export class BooleanOption extends Option {
  constructor(shortName: string, longName: string, description: string) {
    super(shortName, longName, description)
  }
}
