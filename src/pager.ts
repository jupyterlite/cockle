/**
 * Pager for JavaScript and external commands, similar to `less`. Displays a maximum of one page of
 * output at a time which can be scrolled up and down.
 *
 * Commands obtain a pager using `context.services.createPager()`. The Pager class itself is not
 * exported from cockle, only the IPager interface.
 *
 * The command writes its output to the pager rather than to stdout, and must call and await
 * `close()` when it has finished writing. Output that fits on the first page is written directly.
 * Once the first page is full the pager reads keys from stdin, so the command must not read from
 * stdin. The pager registers a POSIX signal callback to handle SIGWINCH, replacing any callback
 * registered by the command.
 *
 * If stdin or stdout is not a terminal, output is passed straight through to stdout.
 */
import { PromiseDelegate } from '@lumino/coreutils';
import { ansi } from './ansi';
import type { ISizeCallback } from './callback';
import { escapeSequenceAt, removeUnsupported } from './escape_sequence';
import type { IAsyncInput, IOutput } from './io';
import { PagedOutput } from './paged_output';
import type { IPosixSignalCallback } from './posix_signal';
import { PosixSignal } from './posix_signal';
import { Termios } from './termios';

const helpText = `                   SUMMARY OF PAGER COMMANDS

  A number N may be typed before a command, its effect is shown in parentheses.

  h  H                     Display this help.
  q  :q  Q  :Q  ZZ         Exit.

                                MOVING

  e  ^E  j  ^N  CR  Down   Forward  one line (or N lines).
  y  ^Y  k  ^K  ^P  Up     Backward one line (or N lines).
  f  ^F  ^V  z  SPACE      Forward  one window (or N lines).
  ESC-SPACE  PageDown      Forward  one window (or N lines).
  b  ^B  w  ESC-v  PageUp  Backward one window (or N lines).
  d  ^D                    Forward  one half-window (or N lines).
  u  ^U                    Backward one half-window (or N lines).
  r  R  ^R  ^L             Repaint screen.

                                JUMPING

  g  <  ESC-<  Home        Go to first line (or line N).
  G  >  ESC->  End         Go to last line (or line N).
  p  %                     Go to beginning (or N percent into output).

                              INFORMATION

  =  ^G  :f                Print position information.
`;

export interface IPager extends IOutput {
  /**
   * Call when the command has finished writing output. The returned promise resolves immediately
   * if all of the output fitted on the first page, otherwise when the user quits the pager.
   */
  close(): Promise<void>;

  /**
   * Whether the user has quit the pager. Once true, further output is discarded, so the command
   * should stop writing and call close().
   */
  readonly hasQuit: boolean;
}

export class Pager extends PagedOutput implements IPager {
  constructor(readonly options: Pager.IOptions) {
    super();
    const { context } = options;
    this._passThrough = !context.stdin.isTerminal() || !context.stdout.isTerminal();
    if (!this._passThrough) {
      this._updateSize();
      context.onPosixSignal(signal => {
        if (signal === PosixSignal.SIGWINCH) {
          this._resize();
        }
      });
    }
  }

  close(): Promise<void> {
    if (!this._closed) {
      this._closed = true;
      if (this._mode === 'paged') {
        // Update prompt in case it should now be (END).
        this._stdout.write('\r' + this._prompt());
      } else if (this._mode === 'direct') {
        this._done.resolve();
      }
    }
    return this._done.promise;
  }

  flush(): void {
    this._stdout.flush();
  }

  get hasQuit(): boolean {
    return this._mode === 'quit';
  }

  isTerminal(): boolean {
    return this._stdout.isTerminal();
  }

  supportsAnsiEscapes(): boolean {
    return this._stdout.supportsAnsiEscapes();
  }

  write(text: string): void {
    if (this._passThrough) {
      this._stdout.write(text);
    } else if (this._mode === 'paged') {
      this.append(text);
    } else if (this._mode === 'direct') {
      const cursorRow = this._cursorRow();
      this.append(text);
      if (this.pagedLineCount <= this._pageRows) {
        this._stdout.write(removeUnsupported(text));
      } else {
        this._startPaging(cursorRow);
      }
    }
    // Output written after the user has quit is discarded.
  }

  private _bell(): void {
    this._stdout.write('\x07');
  }

  private _clampTopRow(topRow: number): number {
    return Math.max(0, Math.min(topRow, this._content.pagedLineCount - this._pageRows));
  }

  /**
   * Close the help page and return to the output at the same position.
   */
  private _closeHelp(): void {
    this._help = undefined;
    this._topRow = this._clampTopRow(this.getLineFirstScreenRow(this._savedTopLine));
    this._repaint();
  }

  /**
   * The content currently displayed, either the help page or the output.
   */
  private get _content(): PagedOutput {
    return this._help ?? this;
  }

  /**
   * Row of the cursor relative to the start of the output, when writing directly to stdout.
   */
  private _cursorRow(): number {
    const n = this.pagedLineCount;
    return this._needsNewLine ? n : n - 1;
  }

  /**
   * Go to a particular output line index.
   */
  private _goToLine(lineIndex: number): void {
    const content = this._content;
    lineIndex = Math.max(0, Math.min(lineIndex, content.lineCount - 1));
    this._setTopRow(content.getLineFirstScreenRow(lineIndex));
  }

  /**
   * Number of screen rows scrolled by half a window.
   */
  private get _halfPageRows(): number {
    return Math.max(Math.floor(this._pageRows / 2), 1);
  }

  private _handleInput(input: string): void {
    let i = 0;
    while (i < input.length && this._mode === 'paged') {
      let key: string;
      if (input.startsWith('\x1b ', i)) {
        // Check explicitly as escapeSequenceAt would combine it with the following character.
        key = '\x1b ';
      } else if (input[i] === '\x1b') {
        key = escapeSequenceAt(input, i);
      } else {
        key = input[i];
      }
      i += key.length;
      this._message = '';

      if (this._pendingKey !== '') {
        this._handlePendingKey(key);
      } else {
        this._handleKey(key);
      }
    }

    if (this._mode === 'paged') {
      this._stdout.write('\r' + this._prompt());
    }
  }

  /**
   * Handle a single key, which may be a multi-character escape sequence.
   */
  private _handleKey(key: string): void {
    if (key >= '0' && key <= '9') {
      this._number += key;
      return;
    }
    if ((key === '\x7f' || key === '\b') && this._number !== '') {
      // Backspace whilst entering a number.
      this._number = this._number.slice(0, -1);
      return;
    }

    // Number entered before the command, if any.
    const n = this._number === '' ? undefined : parseInt(this._number);
    this._number = '';

    switch (key) {
      // Forward one line, or N lines.
      case 'j':
      case 'e':
      case '\x0e': // Ctrl-N
      case '\x05': // Ctrl-E
      case '\r':
      case '\n':
      case '\x1b[B': // Down arrow
      case '\x1bOB':
        this._scroll(n ?? 1);
        break;

      // Backward one line, or N lines.
      case 'k':
      case 'y':
      case '\x10': // Ctrl-P
      case '\x0b': // Ctrl-K
      case '\x19': // Ctrl-Y
      case '\x1b[A': // Up arrow
      case '\x1bOA':
        this._scroll(-(n ?? 1));
        break;

      // Forward one window, or N lines.
      case ' ':
      case 'f':
      case 'z':
      case '\x06': // Ctrl-F
      case '\x16': // Ctrl-V
      case '\x1b ':
      case '\x1b[6~': // PageDown
        this._scroll(n ?? this._pageRows);
        break;

      // Backward one window, or N lines.
      case 'b':
      case 'w':
      case '\x02': // Ctrl-B
      case '\x1bv':
      case '\x1b[5~': // PageUp
        this._scroll(-(n ?? this._pageRows));
        break;

      // Forward half a window, or N lines.
      case 'd':
      case '\x04': // Ctrl-D
        this._scroll(n ?? this._halfPageRows);
        break;

      // Backward half a window, or N lines.
      case 'u':
      case '\x15': // Ctrl-U
        this._scroll(-(n ?? this._halfPageRows));
        break;

      // Go to first line, or line N.
      case 'g':
      case '<':
      case '\x1b<':
      case '\x1b[H': // Home
      case '\x1bOH':
      case '\x1b[1~':
        this._goToLine((n ?? 1) - 1);
        break;

      // Go to last line, or line N.
      case 'G':
      case '>':
      case '\x1b>':
      case '\x1b[F': // End
      case '\x1bOF':
      case '\x1b[4~':
        this._goToLine(n === undefined ? this._content.lineCount - 1 : n - 1);
        break;

      // Go to N percent of the way through the output.
      case 'p':
      case '%':
        this._goToLine(Math.floor((Math.min(n ?? 0, 100) / 100) * this._content.lineCount));
        break;

      // Repaint.
      case 'r':
      case 'R':
      case '\x12': // Ctrl-R
      case '\x0c': // Ctrl-L
        this._repaint();
        break;

      // Position information.
      case '=':
      case '\x07': // Ctrl-G
        this._message = this._positionInfo();
        break;

      // Help.
      case 'h':
      case 'H':
        if (this._help === undefined) {
          this._openHelp();
        } else {
          this._bell();
        }
        break;

      // Start of a two key command.
      case ':':
      case 'Z':
        this._pendingKey = key;
        break;

      case 'q':
      case 'Q':
        this._quit();
        break;

      default:
        this._bell();
        break;
    }
  }

  /**
   * Handle the second key of a two key command.
   */
  private _handlePendingKey(key: string): void {
    const pendingKey = this._pendingKey;
    this._pendingKey = '';

    if (pendingKey === ':') {
      if (key === 'q' || key === 'Q') {
        this._quit();
      } else if (key === 'f') {
        this._message = this._positionInfo();
      } else {
        this._bell();
      }
    } else if (pendingKey === 'Z') {
      if (key === 'Z') {
        this._quit();
      } else {
        this._bell();
      }
    }
  }

  /**
   * Open the help page, remembering the current position in the output.
   */
  private _openHelp(): void {
    this._savedTopLine = this._topLine;
    this._help = new PagedOutput(this.columns);
    this._help.append(helpText);
    this._topRow = 0;
    this._repaint();
  }

  /**
   * Number of screen rows used to display output, the last row is used for the prompt.
   */
  private get _pageRows(): number {
    return Math.max(this._rows - 1, 1);
  }

  private _positionInfo(): string {
    const content = this._content;
    const first = this._topLine + 1;
    const lastRow = Math.min(this._topRow + this._pageRows, content.pagedLineCount) - 1;
    const last = content.getLineIndex(lastRow) + 1;
    const percent = Math.round((100 * last) / content.lineCount);
    return `lines ${first}-${last}/${content.lineCount} ${percent}%`;
  }

  private _prompt(): string {
    const atEnd = this._topRow + this._pageRows >= this._content.pagedLineCount;
    let text: string;
    if (this._pendingKey !== '') {
      text = this._pendingKey;
    } else if (this._number !== '') {
      text = this._number;
    } else if (this._message !== '') {
      text = ansi.styleReverse + this._message + ansi.styleReset;
    } else if (this._help !== undefined) {
      let help = atEnd ? 'HELP -- END -- press q when done' : 'HELP -- press q when done';
      // Truncate so that the prompt does not wrap on a narrow terminal.
      help = help.slice(0, Math.max(this.columns - 1, 1));
      text = ansi.styleReverse + help + ansi.styleReset;
    } else if (this._closed && atEnd) {
      text = ansi.styleReverse + '(END)' + ansi.styleReset;
    } else {
      text = ':';
    }
    return ansi.eraseEndLine + text;
  }

  /**
   * Quit the help page if it is displayed, otherwise quit the pager.
   */
  private _quit(): void {
    if (this._help !== undefined) {
      this._closeHelp();
    } else {
      this._mode = 'quit';
    }
  }

  /**
   * Render the page and prompt starting at the current cursor position, which must be the start
   * of the top row of the page.
   */
  private _render(): void {
    const content = this._content;
    const count = content.pagedLineCount;
    let text = '';
    for (let row = this._topRow; row < this._topRow + this._pageRows; row++) {
      // Erase before writing the row, as erasing after a full width row would erase its last
      // character.
      text += ansi.eraseEndLine + (row < count ? content.getScreenRow(row) : '') + '\n';
    }
    text += this._prompt();
    this._stdout.write(text);
  }

  /**
   * Clear the screen and render the page and prompt.
   */
  private _repaint(): void {
    this._stdout.write(ansi.eraseScreen + ansi.cursorHome);
    this._render();
  }

  private _resize(): void {
    if (this._mode === 'paged') {
      // Keep the same line at the top of the page.
      const topLine = this._topLine;
      this._updateSize();
      this._topRow = this._clampTopRow(this._content.getLineFirstScreenRow(topLine));
      this._repaint();
    } else if (this._mode === 'direct') {
      this._updateSize();
      if (!this._closed && this.pagedLineCount > this._pageRows) {
        // Output no longer fits on a single page.
        this._stdout.write(ansi.eraseScreen + ansi.cursorHome);
        this._startPaging(0);
      }
    }
  }

  private async _run(): Promise<void> {
    const { stdin, termios } = this.options.context;

    // Disable canonical mode (buffered I/O) and echo from stdin to stdout.
    const oldTermios = termios.get();
    const newTermios = Termios.cloneFlags(oldTermios);
    newTermios.c_lflag &= ~Termios.LocalFlag.ICANON & ~Termios.LocalFlag.ECHO;

    try {
      termios.set(newTermios);
      while (this._mode === 'paged') {
        const input = await stdin.readAsync(null);
        if (input.length === 0) {
          this._mode = 'quit';
        } else {
          this._handleInput(input);
        }
      }
    } finally {
      this._mode = 'quit';
      termios.set(oldTermios);
      // Erase prompt.
      this._stdout.write('\r' + ansi.eraseEndLine);
      this._done.resolve();
    }
  }

  private _scroll(offset: number): void {
    this._setTopRow(this._topRow + offset);
  }

  /**
   * Set the screen row displayed at the top of the page, and render if it has changed.
   */
  private _setTopRow(topRow: number): void {
    topRow = this._clampTopRow(topRow);
    if (topRow !== this._topRow) {
      this._topRow = topRow;
      this._stdout.write(ansi.cursorHome);
      this._render();
    }
  }

  /**
   * Switch from writing output directly to paged mode. `cursorRow` is the row of the cursor
   * relative to the start of the output.
   */
  private _startPaging(cursorRow: number): void {
    this._mode = 'paged';
    this._topRow = 0;
    // Move to start of output and render the first page, which fills the whole screen.
    this._stdout.write('\r' + ansi.cursorUp(cursorRow));
    this._render();
    this._run().catch(err => console.error(`Pager: ${err}`));
  }

  private get _stdout(): IOutput {
    return this.options.context.stdout;
  }

  /**
   * Index of line displayed at the top of the page.
   */
  private get _topLine(): number {
    return this._content.getLineIndex(this._topRow);
  }

  private _updateSize(): void {
    const { rows, columns } = this.options.context.size();
    this._rows = Math.max(rows, 1);
    this.setColumns(columns);
    this._help?.setColumns(columns);
  }

  private _closed = false;
  private _done = new PromiseDelegate<void>();
  private _help?: PagedOutput; // Help page, if it is displayed.
  private _message = ''; // One-off message shown in place of the prompt.
  private _mode: 'direct' | 'paged' | 'quit' = 'direct';
  private _number = ''; // Digits entered before a command.
  private _passThrough: boolean;
  private _pendingKey = ''; // First key of a two key command.
  private _rows = 1;
  private _savedTopLine = 0; // Output line at top of page when help page was opened.
  private _topRow = 0; // Index of screen row displayed at top of page.
}

export namespace Pager {
  /**
   * The parts of a JavaScript or external command context that a pager uses.
   */
  export interface IContext {
    stdin: IAsyncInput;
    stdout: IOutput;
    size: ISizeCallback;
    termios: Termios.ITermios;
    onPosixSignal(callback: IPosixSignalCallback): void;
  }

  export interface IOptions {
    context: IContext;
  }
}
