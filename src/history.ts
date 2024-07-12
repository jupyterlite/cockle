import { IOutput } from "./io/output"

/**
 * Command history. Also maintains a current index in the history for scrolling through it.
 */
export class History {
  add(command: string) {
    this._current = null

    if (!command.trim()) {
      // Do nothing with command that is all whitespace.
      return
    }
    if (this._history.length >= this._maxSize) {
      this._history.shift()
    }
    this._history.push(command)
  }

  // Supports negative indexing from end.
  at(index: number): string | null {
    return this._history.at(index) ?? null
  }

  scrollCurrent(next: boolean): string | null {
    if (next) {
      this._current = (this._current === null) ? null : this._current+1
    } else {
      this._current = (this._current === null) ? this._history.length-1 : this._current-1
    }

    if (this._current !== null) {
      if (this._current < 0) {
        this._current = 0
      } else if (this._current >= this._history.length) {
        this._current = null
      }
    }

    return this._current === null ? null : this.at(this._current)
  }

  async write(output: IOutput): Promise<void> {
    for (let i = 0; i < this._history.length; i++) {
      const index = String(i).padStart(5, ' ')
      await output.write(`${index}  ${this._history[i]}\n`)
    }
  }

  private _history: string[] = []
  private _current: number | null = null

  // Smnall number for debug purposes. Should probably get this from an env var.
  private _maxSize: number = 5
}
