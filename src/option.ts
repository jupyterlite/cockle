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

  protected _isSet: boolean = false
}

export class BooleanOption extends Option {
  constructor(shortName: string, longName: string, description: string) {
    super(shortName, longName, description)
  }
}

// Greedily consumes all remaining options as paths.
export class TrailingPathsOption extends Option {
  constructor(readonly minCount: number = 1) {
    super("", "", "")
    if (minCount < 0) {
      throw Error("Negative minCount in PathsOption.constructor")
    }
  }

  add(path: string) {
    this._paths.push(path)
    this._isSet = true
  }

  get length(): number {
    return this.paths.length
  }

  get paths(): string[] {
    return this._paths
  }

  private _paths: string[] = []
}
