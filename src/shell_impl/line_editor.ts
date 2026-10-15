import type { Aliases } from '../aliases';
import { ansi } from '../ansi';
import type { ICommandLine } from '../command_line';
import type { Environment } from '../environment';
import { expandString } from '../expand';
import type { History } from '../history';
import { isCommandComplete } from '../parse';
import type { TabCompleter } from '../tab_completer';

export interface ILineEditorHost {
  readonly aliases: Aliases;
  readonly history: History;
  environment(): Environment;
  output(text: string): void;
  outputPrompt(promptIndex?: number): Promise<void>;
  runCommands(cmdText: string): Promise<void>;
  terminate(): void;
}

export class LineEditor {
  constructor(
    private readonly _host: ILineEditorHost,
    private readonly _tabCompleter: TabCompleter
  ) {}

  async input(chars: string): Promise<void> {
    // Input can be from the keyboard or a paste operation.
    // Input from the keyboard is for a single keystroke which may be a single character or
    // multiple characters if it is an escape code (e.g. left arrow).
    // Input from a paste operation will be a single, potentially very large, string.
    const n = chars.length;
    for (let index = 0; index < n; ++index) {
      const char = chars[index];
      const code = char.charCodeAt(0);
      switch (code) {
        case 10:
        case 13: {
          // \r or \n: run the command line, or continue it on the next line if incomplete.
          this._host.output('\n');
          const cmdText = this._commandLine.text;
          this._commandLine.text = '';
          this._commandLine.cursorIndex = 0;
          let promptIndex = 1;
          if (cmdText.length > 0) {
            if (isCommandComplete(cmdText, this._host.aliases)) {
              await this._host.runCommands(cmdText);
            } else {
              // Keep the text and wait for the next line.
              this._commandLine.text = `${cmdText}\n`;
              this._commandLine.cursorIndex = this._commandLine.text.length;
              promptIndex = 2;
            }
          }
          await this._host.outputPrompt(promptIndex);
          break;
        }
        case 127: // Backspace
          if (this._commandLine.cursorIndex > 0) {
            const { cursorIndex, text } = this._commandLine;
            const suffix = text.slice(cursorIndex);
            this._commandLine.text = text.slice(0, cursorIndex - 1) + suffix;
            this._commandLine.cursorIndex--;
            this._host.output(
              ansi.cursorLeft(1) + suffix + ansi.eraseEndLine + ansi.cursorLeft(suffix.length)
            );
          }
          break;
        case 9: // Tab \t
          this._commandLine = await this._tabCompleter.complete(this._commandLine);
          break;
        case 27: // Escape following by 1+ more characters
          index += this._escapedInput(chars, index);
          break;
        case 3: // Ctrl-C: discard the current command line and show a new prompt.
          this._host.output('^C');
          this._commandLine.text = '';
          this._commandLine.cursorIndex = 0;
          await this._host.outputPrompt();
          break;
        case 4: // EOT, usually = Ctrl-D: exit the shell if the command line is empty.
          if (this._commandLine.text.length === 0) {
            this._host.output('exit\n');
            this._host.terminate();
            return;
          }
          break;
        case 12: {
          // FF, usually = Ctrl-L. Clear screen, then redraw prompt and command line.
          const { cursorIndex, text } = this._commandLine;
          this._host.output(ansi.eraseScreen + ansi.eraseSavedLines + ansi.cursorHome);
          await this._host.outputPrompt();
          this._host.output(text + ansi.cursorLeft(text.length - cursorIndex));
          break;
        }
        default:
          // Add char to command line at cursor position.
          if (this._commandLine.cursorIndex === this._commandLine.text.length) {
            // Append char.
            this._commandLine.text += char;
            this._host.output(char);
          } else {
            // Insert char.
            const { cursorIndex, text } = this._commandLine;
            const suffix = text.slice(cursorIndex);
            this._commandLine.text = text.slice(0, cursorIndex) + char + suffix;
            this._host.output(ansi.eraseEndLine + char + suffix + ansi.cursorLeft(suffix.length));
          }
          this._commandLine.cursorIndex++;
          break;
      }
    }
  }

  /**
   * Handle input where the first character is an escape (ascii 27).
   * @param chars Input string.
   * @param index Index of the ESCAPE character in input string.
   * @returns Number of characters consumed.
   */
  private _escapedInput(chars: string, index: number): number {
    if (chars.at(index + 1) !== '[') {
      return 0;
    }

    // Escape token excluding initial ESC and [
    const regex = /^[^A-Z~]*[A-Z~]/;
    const match = regex.exec(chars.slice(index + 2));
    if (match === null) {
      return 1; // Skip the [
    }

    const token = match[0];
    switch (token) {
      case 'A': // Up arrow
      case '1A':
      case 'B': // Down arrow
      case '1B': {
        const cmdText = this._host.history.scrollCurrent(token.endsWith('B'));
        this._commandLine.text = cmdText !== null ? cmdText : '';
        this._commandLine.cursorIndex = this._commandLine.text.length;
        // Re-output whole line.
        this._host.output(
          ansi.eraseEndLine +
            ansi.eraseStartLine +
            `\r${expandString(this._host.environment().getPrompt(1), this._host.environment())}${this._commandLine.text}`
        );
        break;
      }
      case 'D': // Left arrow
      case '1D':
        if (this._commandLine.cursorIndex > 0) {
          this._commandLine.cursorIndex--;
          this._host.output(ansi.cursorLeft());
        }
        break;
      case 'C': // Right arrow
      case '1C':
        if (this._commandLine.cursorIndex < this._commandLine.text.length) {
          this._commandLine.cursorIndex++;
          this._host.output(ansi.cursorRight());
        }
        break;
      case '3~': // Delete
        if (this._commandLine.cursorIndex < this._commandLine.text.length) {
          const { cursorIndex, text } = this._commandLine;
          const suffix = text.slice(cursorIndex + 1);
          this._commandLine.text = text.slice(0, cursorIndex) + suffix;
          this._host.output(ansi.eraseEndLine + suffix + ansi.cursorLeft(suffix.length));
        }
        break;
      case 'H': // Home
      case '1;2H':
        if (this._commandLine.cursorIndex > 0) {
          this._host.output(ansi.cursorLeft(this._commandLine.cursorIndex));
          this._commandLine.cursorIndex = 0;
        }
        break;
      case 'F': // End
      case '1;2F': {
        const { length } = this._commandLine.text;
        if (this._commandLine.cursorIndex < length) {
          this._host.output(ansi.cursorRight(length - this._commandLine.cursorIndex));
          this._commandLine.cursorIndex = length;
        }
        break;
      }
      case '1;2D': // Start of previous word
      case '1;5D':
        if (this._commandLine.cursorIndex > 0) {
          const { cursorIndex, text } = this._commandLine;
          const index = text.slice(0, cursorIndex).trimEnd().lastIndexOf(' ') + 1;
          this._host.output(ansi.cursorLeft(cursorIndex - index));
          this._commandLine.cursorIndex = index;
        }
        break;
      case '1;2C': // End of next word
      case '1;5C': {
        const { length } = this._commandLine.text;
        if (this._commandLine.cursorIndex < length - 1) {
          const { cursorIndex, text } = this._commandLine;
          const end = text.slice(cursorIndex);
          const trimmed = end.trimStart();
          const i = trimmed.indexOf(' ');
          const index = i < 0 ? length : cursorIndex + end.length - trimmed.length + i;
          this._host.output(ansi.cursorRight(index - cursorIndex));
          this._commandLine.cursorIndex = index;
        }
        break;
      }
      default:
        // Unrecognised control sequence, ignore.
        console.warn(`Unrecognised escape sequence '[${token}'`);
        break;
    }

    return token.length + 1;
  }

  private _commandLine: ICommandLine = { text: '', cursorIndex: 0 };
}
