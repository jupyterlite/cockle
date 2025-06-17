/**
 * Environment available in external commands.
 * Stores which entries have changed so that only the changed values are copied back to
 * the WebWorker environment rather than all the entries.
 */
export class ExternalEnvironment extends Map<string, string> {
  override delete(key: string): boolean {
    if (this._changed === undefined) {
      this._changed = new Set<string>();
    }
    this._changed.add(key);
    return super.delete(key);
  }

  /**
   * Return object containing only those entries that have changed, or undefined if no
   * values have changed.
   * An entry with a string value has changed to that string.
   * An entry with an undefined value has been deleted.
   */
  get changed(): { [key: string]: string | undefined } | undefined {
    if (this._changed === undefined) {
      return undefined;
    }

    const ret: { [key: string]: string | undefined } = {};
    this._changed.forEach(name => (ret[name] = this.get(name)));
    return ret;
  }

  override set(key: string, value: string): this {
    if (this._changed === undefined) {
      this._changed = new Set<string>();
    }
    this._changed.add(key);
    super.set(key, value);
    return this;
  }

  private _changed?: Set<string>;
}
