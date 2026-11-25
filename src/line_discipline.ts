// Line discipline, which sits between the terminal and the running command and implements the
// termios settings. It runs in the main UI thread.
//
// Input from the terminal (fromTerminal) is translated, echoed back to the terminal, edited if in
// canonical mode, and passed to the command (toCommand) or converted to a POSIX signal (signal).
// Output from the command (fromCommand) is translated and passed to the terminal (toTerminal).
//
// Based on MIT licensed https://github.com/mame/xterm-pty but using UTF-16 code units rather than
// UTF-8 bytes. The license of the original code is:
//
// Copyright 2022 Yusuke Endoh
//
// Permission is hereby granted, free of charge, to any person obtaining a copy of this software
// and associated documentation files (the "Software"), to deal in the Software without
// restriction, including without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the
// Software is furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in all copies or
// substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING
// BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
// NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

import { ansi } from './ansi';
import type { IOutputCallback } from './callback';
import { escapeSequenceAt, isIncompleteEscapeSequenceAt } from './escape_sequence';
import { PosixSignal } from './posix_signal';
import { Termios } from './termios';
import { isLetter, isLowSurrogate, stringFromCharCodes } from './utils';

const BS = 8; // Backspace
const TAB = 9;
const NL = 10; // Linefeed \n
const CR = 13; // Carriage return \r
const ESC = 27;
const SP = 32; // Space

type EraseAction = 'VERASE' | 'VWERASE' | 'VKILL';

type KeyAction =
  | EraseAction
  | 'VEOF'
  | 'VEOL'
  | 'VREPRINT'
  | 'VLNEXT'
  | 'VSTART'
  | 'VSTOP'
  | 'VINTR';

// Control characters that are echoed as ^X if ECHOCTL is set.
function isEchoedAsCaret(c: number): boolean {
  return (c < 32 && c !== TAB) || c === 127;
}

function isWordChar(c: number): boolean {
  return isLetter(c) || (c >= 48 && c <= 57) || c === 95; // Letter, digit or underscore.
}

export namespace LineDiscipline {
  export interface IOptions {
    termiosFlags: Termios.IFlags;

    /**
     * Send processed output and echoed input to the terminal.
     */
    toTerminal: IOutputCallback;

    /**
     * Send input to the command. An empty string means end-of-file.
     */
    toCommand(chars: string): void;

    /**
     * Send a POSIX signal to the command.
     */
    signal(signal: PosixSignal): void;
  }
}

export class LineDiscipline {
  constructor(readonly options: LineDiscipline.IOptions) {
    this.setTermios(options.termiosFlags);
  }

  /**
   * Start a new line if the cursor is not at the start of a line.
   */
  freshLine(): void {
    if (this._column > 0) {
      this._outputChar(NL);
      this._flushToTerminal();
    }
  }

  /**
   * Handle output from the command.
   */
  fromCommand(text: string): void {
    // An incomplete escape sequence has already been sent to the terminal.
    let alreadySent = this._incompleteEscape.length;
    text = this._incompleteEscape + text;
    this._incompleteEscape = '';

    for (let i = 0; i < text.length; ) {
      const c = text.charCodeAt(i);
      if (c !== ESC) {
        this._outputChar(c);
        i++;
        continue;
      }

      // Escape sequences are passed to the terminal without any output processing.
      let sequence: string;
      if (isIncompleteEscapeSequenceAt(text, i)) {
        sequence = this._incompleteEscape = text.slice(i);
      } else {
        sequence = escapeSequenceAt(text, i);
        if (sequence === ansi.enableAlternativeBuffer) {
          this._savedColumn = this._column;
        } else if (sequence === ansi.disableAlternativeBuffer) {
          this._column = this._savedColumn;
        } else if (sequence === ansi.cursorHome) {
          this._column = 0;
        }
      }
      for (let j = alreadySent; j < sequence.length; j++) {
        this._toTerminalBuf.push(sequence.charCodeAt(j));
      }
      i += Math.max(sequence.length, alreadySent);
      alreadySent = 0;
    }
    this._flushToTerminal();
  }

  /**
   * Handle input from the terminal.
   */
  fromTerminal(chars: string): void {
    const { InputFlag, LocalFlag } = Termios;

    for (let i = 0; i < chars.length; i++) {
      let c = chars.charCodeAt(i);
      if (this._i(InputFlag.ISTRIP)) {
        c &= 0x7f;
      }
      if (this._i(InputFlag.IUCLC) && this._l(LocalFlag.IEXTEN) && c >= 65 && c <= 90) {
        c += 32; // To lower case.
      }

      const action = this._literalNext ? undefined : this._keyActions.get(c);
      this._literalNext = false;

      switch (action) {
        case undefined:
          this._checkStartFlow();
          this._inputChar(c);
          break;
        case 'VERASE':
        case 'VWERASE':
        case 'VKILL':
          this._checkStartFlow();
          this._erase(action);
          this._flushToTerminal();
          break;
        case 'VEOF':
          this._checkStartFlow();
          this._flushToCommand();
          break;
        case 'VEOL':
          this._checkStartFlow();
          if (this._l(LocalFlag.ECHO)) {
            this._echo([c]);
            this._flushToTerminal();
          }
          this._toCommandBuf.push(c);
          this._flushToCommand();
          break;
        case 'VLNEXT':
          this._checkStartFlow();
          this._nextLiteral();
          break;
        case 'VREPRINT':
          this._checkStartFlow();
          this._reprint();
          this._flushToTerminal();
          break;
        case 'VSTART':
          this._stopped = false;
          this._flushToTerminal();
          break;
        case 'VSTOP':
          this._stopped = true;
          break;
        case 'VINTR':
          this._signal(PosixSignal.SIGINT, c);
          break;
      }
    }

    // In non-canonical mode there is no end-of-file to deliver, so only flush if there is input.
    if (!this._l(LocalFlag.ICANON) && this._toCommandBuf.length > 0) {
      this._flushToCommand();
    }
  }

  /**
   * Reset when the command finishes. Restarts output if it is stopped, and returns any partial
   * line of input that has not been sent to the command.
   */
  reset(): string {
    const pending = stringFromCharCodes(this._toCommandBuf);
    this._clearToCommand();
    this._echoPrt = false;
    this._literalNext = false;
    this._stopped = false;
    this._flushToTerminal();
    return pending;
  }

  setTermios(flags: Termios.IFlags): void {
    const { ControlCharacter, InputFlag, LocalFlag } = Termios;
    this._flags = flags;

    const cc = flags.c_cc;
    const keyActions = new Map<number, KeyAction>();
    if (this._l(LocalFlag.ICANON)) {
      keyActions.set(cc[ControlCharacter.VEOF], 'VEOF');
      keyActions.set(cc[ControlCharacter.VEOL], 'VEOL');
      keyActions.set(cc[ControlCharacter.VEOL2], 'VEOL');
      keyActions.set(cc[ControlCharacter.VERASE], 'VERASE');
      keyActions.set(cc[ControlCharacter.VKILL], 'VKILL');
      if (this._l(LocalFlag.IEXTEN)) {
        keyActions.set(cc[ControlCharacter.VREPRINT], 'VREPRINT');
        keyActions.set(cc[ControlCharacter.VWERASE], 'VWERASE');
      }
    }
    if (this._l(LocalFlag.IEXTEN)) {
      keyActions.set(cc[ControlCharacter.VLNEXT], 'VLNEXT');
    }
    if (this._i(InputFlag.IXON)) {
      keyActions.set(cc[ControlCharacter.VSTART], 'VSTART');
      keyActions.set(cc[ControlCharacter.VSTOP], 'VSTOP');
    }
    if (this._l(LocalFlag.ISIG)) {
      // VQUIT and VSUSP do not send signals as commands cannot be suspended and do not terminate
      // cleanly on SIGQUIT, so they are passed to the command as normal characters.
      keyActions.set(cc[ControlCharacter.VINTR], 'VINTR');
    }
    keyActions.delete(0); // A control character of 0 is disabled.
    this._keyActions = keyActions;

    if (!this._i(InputFlag.IXON)) {
      this._stopped = false;
      this._flushToTerminal();
    }

    // A partial line is available to read as soon as canonical mode is turned off.
    if (!this._l(LocalFlag.ICANON) && this._toCommandBuf.length > 0) {
      this._flushToCommand();
    }
  }

  private _checkStartFlow(): void {
    const { InputFlag } = Termios;
    if (this._stopped && this._i(InputFlag.IXON) && this._i(InputFlag.IXANY)) {
      this._stopped = false;
      this._flushToTerminal();
    }
  }

  private _clearToCommand(): void {
    this._toCommandBuf = [];
    this._updateBaseColumn();
  }

  /**
   * Echo input characters to the terminal. If raw, control characters are not shown as ^X.
   */
  private _echo(chars: number[], raw: boolean = false): void {
    for (const c of chars) {
      if (!raw && this._l(Termios.LocalFlag.ECHOCTL) && isEchoedAsCaret(c)) {
        this._toTerminalBuf.push(94, c ^ 0x40); // '^' followed by the character, e.g. ^C
        this._column += 2;
      } else {
        this._outputChar(c);
      }
    }
  }

  private _erase(action: EraseAction): void {
    const { ControlCharacter, InputFlag, LocalFlag } = Termios;
    const echo = this._l(LocalFlag.ECHO);
    const echoCtl = this._l(LocalFlag.ECHOCTL);
    const utf8 = this._i(InputFlag.IUTF8);

    if (this._toCommandBuf.length === 0) {
      return;
    }

    if (action === 'VKILL') {
      if (!echo) {
        this._clearToCommand();
        return;
      }
      if (!this._l(LocalFlag.ECHOK) || !this._l(LocalFlag.ECHOKE) || !this._l(LocalFlag.ECHOE)) {
        this._clearToCommand();
        this._finishEchoPrt();
        this._echo([this._flags.c_cc[ControlCharacter.VKILL]]);
        if (this._l(LocalFlag.ECHOK)) {
          this._echo([NL], true);
        }
        return;
      }
    }

    let wordCharFound = false;
    for (let index = this._toCommandBuf.length - 1; index >= 0; index--) {
      const c = this._toCommandBuf[index];
      if (utf8 && isLowSurrogate(c)) {
        continue; // Erase a surrogate pair together.
      }

      if (action === 'VWERASE') {
        if (isWordChar(c)) {
          wordCharFound = true;
        } else if (wordCharFound) {
          break;
        }
      }

      const removed = this._toCommandBuf.splice(index);
      if (echo) {
        if (this._l(LocalFlag.ECHOPRT)) {
          this._startEchoPrt();
          this._echo(removed);
        } else if (action === 'VERASE' && !this._l(LocalFlag.ECHOE)) {
          this._echo([this._flags.c_cc[ControlCharacter.VERASE]]);
        } else if (c === TAB) {
          // Width of the tab depends on the columns taken by the characters before it.
          let count = 0;
          let tabFound = false;
          for (let i = this._toCommandBuf.length - 1; i >= 0; i--) {
            const prev = this._toCommandBuf[i];
            if (prev === TAB) {
              tabFound = true;
              break;
            } else if (isEchoedAsCaret(prev)) {
              if (echoCtl) {
                count += 2;
              }
            } else if (!(utf8 && isLowSurrogate(prev))) {
              count++;
            }
          }
          if (!tabFound) {
            count += this._baseColumn;
          }

          count = 8 - (count % 8);
          this._toTerminalBuf.push(...new Array(count).fill(BS));
          this._column = Math.max(0, this._column - count);
        } else {
          if (isEchoedAsCaret(c) && echoCtl) {
            this._echo([BS, SP, BS], true); // Erase the '^' of ^X.
          }
          if (!isEchoedAsCaret(c) || echoCtl) {
            this._echo([BS, SP, BS], true);
          }
        }
      }

      if (action === 'VERASE') {
        break;
      }
    }

    if (this._toCommandBuf.length === 0) {
      this._clearToCommand();
      if (echo) {
        this._finishEchoPrt();
      }
    }
  }

  private _finishEchoPrt(): void {
    if (this._echoPrt) {
      this._echo([47], true); // '/'
      this._echoPrt = false;
    }
  }

  private _flushToCommand(): void {
    this.options.toCommand(stringFromCharCodes(this._toCommandBuf));
    this._clearToCommand();
  }

  private _flushToTerminal(): void {
    if (this._stopped || this._toTerminalBuf.length === 0) {
      return;
    }
    this.options.toTerminal(stringFromCharCodes(this._toTerminalBuf));
    this._toTerminalBuf = [];
  }

  // True if the input flag is set.
  private _i(flag: Termios.InputFlag): boolean {
    return (this._flags.c_iflag & flag) > 0;
  }

  /**
   * Handle a single input character that is not a special control character.
   */
  private _inputChar(c: number): void {
    const { InputFlag, LocalFlag } = Termios;
    const echo = this._l(LocalFlag.ECHO);

    if (c === CR) {
      if (this._i(InputFlag.IGNCR)) {
        return;
      }
      if (this._i(InputFlag.ICRNL)) {
        c = NL;
      }
    } else if (c === NL && this._i(InputFlag.INLCR)) {
      c = CR;
    }

    if (this._l(LocalFlag.ICANON) && c === NL) {
      // End of line, so the line is available to read.
      if (echo || this._l(LocalFlag.ECHONL)) {
        this._echo([NL], true);
        this._flushToTerminal();
      }
      this._toCommandBuf.push(NL);
      this._flushToCommand();
    } else if (echo) {
      this._finishEchoPrt();
      this._updateBaseColumn();
      this._echo([c], c === NL);
      this._flushToTerminal();
      this._toCommandBuf.push(c);
    } else {
      this._toCommandBuf.push(c);
    }
  }

  // True if the local flag is set.
  private _l(flag: Termios.LocalFlag): boolean {
    return (this._flags.c_lflag & flag) > 0;
  }

  private _nextLiteral(): void {
    const { LocalFlag } = Termios;
    this._literalNext = true;
    if (this._l(LocalFlag.ECHO)) {
      this._finishEchoPrt();
      if (this._l(LocalFlag.ECHOCTL)) {
        this._echo([94, BS], true); // '^' then backspace so that the next character replaces it.
        this._flushToTerminal();
      }
    }
  }

  // True if the output flag is set.
  private _o(flag: Termios.OutputFlag): boolean {
    return (this._flags.c_oflag & flag) > 0;
  }

  /**
   * Add a single character to the terminal buffer, applying output processing if OPOST is set.
   */
  private _outputChar(c: number): void {
    const { InputFlag, OutputFlag } = Termios;

    if (!this._o(OutputFlag.OPOST)) {
      if (c === CR) {
        this._column = 0;
      } else if (c >= SP) {
        this._column++;
      }
      this._toTerminalBuf.push(c);
      return;
    }

    switch (c) {
      case BS:
        if (this._column > 0) {
          this._column--;
        }
        this._toTerminalBuf.push(BS);
        break;
      case TAB: {
        const spaces = 8 - (this._column % 8);
        this._column += spaces;
        if ((this._flags.c_oflag & OutputFlag.TABDLY) === OutputFlag.TABDLY) {
          this._toTerminalBuf.push(...new Array(spaces).fill(SP)); // Expand tabs to spaces.
        } else {
          this._toTerminalBuf.push(TAB);
        }
        break;
      }
      case NL:
        if (this._o(OutputFlag.ONLCR)) {
          this._baseColumn = this._column = 0;
          this._toTerminalBuf.push(CR, NL);
        } else if (this._o(OutputFlag.ONLRET)) {
          this._column = 0;
          this._toTerminalBuf.push(NL);
        } else {
          this._baseColumn = this._column;
          this._toTerminalBuf.push(NL);
        }
        break;
      case CR:
        if (this._o(OutputFlag.ONOCR) && this._column === 0) {
          // No CR at column 0.
        } else if (this._o(OutputFlag.OCRNL)) {
          if (this._o(OutputFlag.ONLRET)) {
            this._baseColumn = this._column = 0;
          }
          this._toTerminalBuf.push(NL);
        } else {
          this._baseColumn = this._column = 0;
          this._toTerminalBuf.push(CR);
        }
        break;
      default:
        if (!(this._i(InputFlag.IUTF8) && isLowSurrogate(c))) {
          this._column++;
        }
        if (this._o(OutputFlag.OLCUC) && c >= 97 && c <= 122) {
          c -= 32; // To upper case.
        }
        this._toTerminalBuf.push(c);
        break;
    }
  }

  private _reprint(): void {
    this._finishEchoPrt();
    this._echo([this._flags.c_cc[Termios.ControlCharacter.VREPRINT]]);
    this._echo([NL], true);
    this._echo(this._toCommandBuf);
  }

  private _signal(signal: PosixSignal, c: number): void {
    const { InputFlag, LocalFlag } = Termios;
    this.options.signal(signal);
    if (!this._l(LocalFlag.NOFLSH)) {
      this._toTerminalBuf = [];
      this._clearToCommand();
    }
    if (this._i(InputFlag.IXON)) {
      this._stopped = false;
    }
    if (this._l(LocalFlag.ECHO)) {
      this._echo([c]);
    }
    this._flushToTerminal();
  }

  private _startEchoPrt(): void {
    if (!this._echoPrt) {
      this._echo([92], true); // '\'
      this._echoPrt = true;
    }
  }

  private _updateBaseColumn(): void {
    if (this._toCommandBuf.length === 0) {
      this._baseColumn = this._column;
    }
  }

  private _baseColumn = 0; // Column at the start of _toCommandBuf.
  private _column = 0; // Column of the cursor.
  private _echoPrt = false; // True whilst erasing with ECHOPRT.
  private _flags!: Termios.IFlags;
  private _incompleteEscape = ''; // Incomplete escape sequence from the command.
  private _keyActions = new Map<number, KeyAction>();
  private _literalNext = false; // True if next character is literal, following VLNEXT.
  private _savedColumn = 0; // Column when the alternative buffer was enabled.
  private _stopped = false; // True after VSTOP, false after VSTART.
  private _toCommandBuf: number[] = []; // Flushed at end of line in canonical mode.
  private _toTerminalBuf: number[] = []; // Flushed after each call unless stopped.
}
