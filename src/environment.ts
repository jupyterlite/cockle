/**
 * Collection of environment variables that are known to a shell and are passed in and out of
 * commands.
 */
export class Environment {
  constructor() {
    this._env.set("PS1", "\x1b[1;31mjs-shell:$\x1b[1;0m ")  // red color
  }

  /**
   * Copy environment variables back from a command after it has run.
   */
  copyFromCommand(source: string[]) {
    for (const str of source) {
      const split = str.split("=")
      const key = split.shift()
      if (key && !this._ignore.has(key)) {
        this._env.set(key, split.join("="))
      }
    }
  }

  /**
   * Copy environment variables into a command before it is run.
   */
  copyIntoCommand(target: { [key: string]: string }) {
    for (const [key, value] of this._env.entries()) {
      target[key] = value
    }
  }

  delete(key: string) {
    this._env.delete(key)
  }

  get(key: string): string | null {
    return this._env.get(key) ?? null
  }

  getNumber(key: string): number | null {
    const str = this.get(key)
    if (str === null) {
      return null
    }
    const number = Number(str)
    return isNaN(number) ? null : number
  }

  getPrompt(): string {
    return this._env.get("PS1") ?? "$ "
  }

  set(key: string, value: string) {
    this._env.set(key, value)
  }

  private _env: Map<string, string> = new Map()

  // Keys to ignore when copying back from a command's env vars.
  private _ignore: Set<string> = new Set(["USER", "LOGNAME", "HOME", "LANG", "_"])
}
