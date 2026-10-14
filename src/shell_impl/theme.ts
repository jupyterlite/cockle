import { ansi } from '../ansi';
import type { IShellImpl } from '../defs_internal';
import type { Environment } from '../environment';
import type { TerminalOutput } from '../io';
import { stringFromCharCodes } from '../utils';

export interface IThemeHost {
  stderr: TerminalOutput;
  /** Returns the current environment, which is replaced while a command runs with temporary assignments. */
  environment(): Environment;
  output(text: string): void;
}

/**
 * Status of theme used to track changes and avoid multiple changes at the same time.
 */
enum ThemeStatus {
  Ok = 0,
  PendingChange = 1,
  Changing = 2
}

export class ThemeManager {
  private _darkMode?: boolean;
  private _host: IThemeHost;
  private _options: IShellImpl.IOptions;
  private _requestedDarkMode?: boolean;
  private _themeStatus = ThemeStatus.PendingChange;

  constructor(options: IShellImpl.IOptions, host: IThemeHost) {
    this._options = options;
    this._host = host;
  }

  request(isDark?: boolean): boolean {
    this._requestedDarkMode = isDark;

    if (this._themeStatus !== ThemeStatus.Ok) {
      // Already pending or changing, don't need to repeat.
      return false;
    }

    this._themeStatus = ThemeStatus.PendingChange;
    return true;
  }

  isPending(): boolean {
    return this._themeStatus === ThemeStatus.PendingChange;
  }

  async resolve(): Promise<void> {
    if (this._themeStatus === ThemeStatus.Changing) {
      // Don't run more than once concurrently.
      return;
    }

    if (this._requestedDarkMode !== undefined) {
      // Early return as we already know if dark/light mode.
      this._setDarkMode(this._requestedDarkMode);
      return;
    }

    // Need to determine if dark or light mode.
    this._themeStatus = ThemeStatus.Changing;

    await this._options.enableBufferedStdinCallback(true);
    const { termios, workerIO } = this._options;
    termios.setRawMode();

    // Operating System Command to get terminal background color.
    // https://invisible-island.net/xterm/ctlseqs/ctlseqs.html#h3-Operating-System-Commands
    this._host.output('\x1b]11;?\x07');

    const timeoutMs = 100;
    const start = performance.now();
    const chars = await workerIO.readAsync(null, timeoutMs);
    console.debug('Cockle theme change', (performance.now() - start).toFixed(1), 'ms');

    termios.setDefaultShell();
    await this._options.enableBufferedStdinCallback(false);

    this._themeStatus = ThemeStatus.Ok;

    const charStr = stringFromCharCodes(chars);
    // Expecting something like this: ]11;rgb:8080/0000/ffff\
    // eslint-disable-next-line no-control-regex
    const re = /^\x1b]11;rgb:([0-9A-Fa-f]{2,})\/([0-9A-Fa-f]{2,})\/([0-9A-Fa-f]{2,})\x1b\\$/;
    const match = re.exec(charStr);
    if (!match) {
      console.warn('Unable to determine terminal background color');
      this._setDarkMode(undefined);
    } else {
      const r = parseInt(match[1].slice(0, 2), 16) / 255.0;
      const g = parseInt(match[2].slice(0, 2), 16) / 255.0;
      const b = parseInt(match[3].slice(0, 2), 16) / 255.0;
      const lum = (r + g + b) / 3.0;
      this._setDarkMode(lum < 0.6);
    }
  }

  private _setDarkMode(darkMode: boolean | undefined): void {
    if (darkMode === this._darkMode) {
      return;
    }

    this._darkMode = darkMode;

    // Set prompt color.
    if (this._options.color) {
      this._host.stderr.prefix = darkMode ? ansi.styleBrightRed : ansi.styleRed;

      const promptColor = darkMode ? ansi.styleBoldGreen : ansi.styleGreen;
      this._host.environment().set('PS1', promptColor + 'js-shell:' + ansi.styleReset + ' ');
    }

    // Set/delete environment variable.
    const envVarName = 'COCKLE_DARK_MODE';
    if (darkMode === undefined) {
      this._host.environment().delete(envVarName);
    } else {
      this._host.environment().set(envVarName, darkMode ? '1' : '0');
    }
  }
}
