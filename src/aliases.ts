/**
 * Collection of aliases that are known to a shell.
 */
export class Aliases extends Map<string, string> {
  constructor() {
    super();
  }

  getRecursive(key: string): string | undefined {
    let alias = this.get(key);
    while (alias !== undefined) {
      const newKey = alias.split(' ')[0];
      if (newKey === key) {
        // Avoid infinite recursion.
        break;
      }
      const newAlias = this.get(newKey);
      if (newAlias === undefined) {
        return alias;
      } else {
        alias = newAlias + alias!.slice(newKey.length);
      }
      key = newKey;
    }
    return alias;
  }

  match(start: string): string[] {
    return [...this.keys()].filter(name => name.startsWith(start));
  }
}
