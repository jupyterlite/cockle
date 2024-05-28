import { Option, TrailingPathsOption } from "./option"

export abstract class Options {
  static fromArgs<T extends Options>(args: string[], optionsType: (new () => T)): T {
    const options = new optionsType

    const paths: TrailingPathsOption | null = options._getPaths()
    let inTrailingPaths = false

    for (const arg of args) {
      if (arg[0] == "-" && arg[1] != "-") {
        if (inTrailingPaths) {
          throw Error("Cannot have named option after parsing a trailing path")
        }
        const shortName = arg[1]
        options._findByShortName(shortName).set()
      } else if (paths !== null) {
        paths.add(arg)
        inTrailingPaths = true
      }

      // Not yet handling longName options.
    }

    if (paths && paths.length < paths.minCount) {
      throw Error("Insufficient trailing path options specified")
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

  private _getPaths(): TrailingPathsOption | null {
    if ("paths" in this) {
      return this["paths"] as TrailingPathsOption
    } else {
      return null
    }
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
