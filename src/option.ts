export abstract class Option {
  constructor(readonly shortName: string) {}

  get isSet(): boolean {
    return this._isSet
  }

  set(): void {
    this._isSet = true
  }

  private _isSet: boolean = false
}

export class BooleanOption extends Option {
  constructor(shortName: string) {
    super(shortName)
  }
}
