import { Option } from "./option"

export abstract class Options {
  private static _findByShortName<T extends Options>(options: T, shortName: string): Option {
    let v: Option
    for (v of Object.values(options)) {
      if (v.shortName == shortName) {
        return v
      }
    }
    // Need better error reporting
    throw new Error(`No such shortName option "${shortName}"`)
  }

  static fromArgs<T extends Options>(args: string[], optionsType: (new () => T)): T {
    const options = new optionsType
    for (const arg of args) {
      if (arg[0] == "-") {
        const shortName = arg[1]
        this._findByShortName(options, shortName).set()
      }
    }

    return options
  }
}
