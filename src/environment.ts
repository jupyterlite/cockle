import { ansi } from './ansi';
import type { ISize } from './callback';

export const DEFAULT_USER = 'web_user';

/**
 * Collection of environment variables that are known to a shell and are passed in and out of
 * commands.
 */
export class Environment extends Map<string, string> {
  constructor(entries?: Iterable<readonly [string, string]>) {
    super(entries);
  }

  /**
   * Create the top-level environment of a shell, populated with the default variables.
   */
  static createDefault(
    color: boolean,
    shellId: string,
    browsingContextId: string | undefined,
    user?: string
  ): Environment {
    const env = new Environment();
    if (shellId) {
      env.set('COCKLE_SHELL_ID', shellId);
    }
    if (browsingContextId) {
      env.set('COCKLE_BROWSING_CONTEXT_ID', browsingContextId);
    }
    if (color) {
      env.set('PS1', ansi.styleGreen + 'js-shell:' + ansi.styleReset + ' ');
      env.set('TERM', 'xterm-256color');
      env.set('TERMINFO', '/usr/local/share/terminfo'); // Needed for nano
    } else {
      env.set('PS1', 'js-shell: ');
    }

    // Set env vars for user. These are set by default to use 'web_user' in wasm modules. We only
    // need to set them for a user that is not the default, but let's set them always for
    // consistency in case future wasm modules set different env vars.
    const actualUser = user ?? DEFAULT_USER;
    env.set('HOME', `/home/${actualUser}`);
    env.set('LOGNAME', actualUser);
    env.set('USER', actualUser);

    return env;
  }

  /**
   * Copy environment variables into a command before it is run.
   */
  copyIntoCommand(target: Record<string, string>) {
    for (const [key, value] of this.entries()) {
      target[key] = value;
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

  getPrompt(index: number): string {
    switch (index) {
      case 1:
        return this.get('PS1') ?? '$ ';
      case 2:
        return this.get('PS2') ?? '> ';
    }
    throw new Error(`Unknown prompt index: ${index}`);
  }

  get color(): boolean {
    return this.has('TERM');
  }

  names(): string[] {
    const re = /^[A-Za-z_]/;
    return Array.from(this.keys()).filter(name => re.test(name));
  }

  setSize(size: ISize): void {
    const { rows, columns } = size;
    if (rows >= 1) {
      const rowsString = rows.toString();
      this.set('LINES', rowsString);
    } else {
      this.delete('LINES');
    }

    if (columns >= 1) {
      const columnsString = columns.toString();
      this.set('COLUMNS', columnsString);
    } else {
      this.delete('COLUMNS');
    }
  }
}
