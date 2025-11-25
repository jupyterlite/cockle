import { ansi } from './ansi';

/**
 * Collection of environment variables that are known to a shell and are passed in and out of
 * commands.
 */
export class Environment extends Map<string, string> {
  constructor(color: boolean) {
    super();
    if (color) {
      this.set('PS1', ansi.styleGreen + 'js-shell:' + ansi.styleReset + ' ');
      this.set('TERM', 'xterm-256color');
      this.set('TERMINFO', '/usr/local/share/terminfo'); // Needed for nano
    } else {
      this.set('PS1', 'js-shell: ');
    }
  }

  /**
   * Copy environment variables back from a command after it has run.
   */
  copyFromCommand(source: string[]) {
    for (const str of source) {
      const split = str.split('=');
      const key = split.shift();
      if (key && !this._ignore.has(key)) {
        this.set(key, split.join('='));
      }
    }
  }

  /**
   * Copy environment variables into a command before it is run.
   */
  copyIntoCommand(target: { [key: string]: string }, isTerminal: boolean) {
    for (const [key, value] of this.entries()) {
      if (isTerminal || key !== 'TERM') {
        target[key] = value;
      }
    }
  }

  getNumber(key: string): number | null {
    const str = this.get(key);
    if (str === null) {
      return null;
    }
    const number = Number(str);
    return isNaN(number) ? null : number;
  }

  getPrompt(): string {
    return this.get('PS1') ?? '$ ';
  }

  get color(): boolean {
    return this.has('TERM');
  }

  setSize(rows: number, columns: number): void {
    if (rows >= 1) {
      const rowsString = rows.toString();
      this.set('LINES', rowsString);
      this.set('LESS_LINES', rowsString);
    } else {
      this.delete('LINES');
      this.delete('LESS_LINES');
    }

    if (columns >= 1) {
      const columnsString = columns.toString();
      this.set('COLUMNS', columnsString);
      this.set('LESS_COLUMNS', columnsString);
    } else {
      this.delete('COLUMNS');
      this.delete('LESS_COLUMNS');
    }
  }

  // Keys to ignore when copying back from a command's env vars.
  private _ignore: Set<string> = new Set(['USER', 'LOGNAME', 'HOME', 'LANG', '_']);
}
