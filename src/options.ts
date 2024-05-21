import { Option } from "./option"

export abstract class Options {
  static fromArgs<T extends Options>(args: string[], optionsType: (new () => T)): T {
    const options = new optionsType
    for (const arg of args) {
      if (arg[0] == "-") {
        const shortName = arg[1]
        options._findByShortName(shortName).set()
      }
    }
    return options
  }

  private _findByShortName<T extends Options>(shortName: string): Option {
    let v: Option
    for (v of Object.values(this)) {
      if (v.shortName == shortName) {
        return v
      }
    }
    // Need better error reporting
    throw new Error(`No such shortName option "${shortName}"`)
  }

  _help(): string[] {
    // Dynamically create help text from options.
    // Could have short form for usage, and longer form for man page.
    const sorted = [...Object.values(this)].sort(
      (a, b) => (a.shortName ?? a.longName) > (b.shortName ?? b.longName) ? 1 : -1
    )
    return sorted.map((option) => `-${option.shortName}  ${option.description}`)
  }
}
