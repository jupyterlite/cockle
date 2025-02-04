/**
 * ANSI escape sequences.
 */

const ESC = '\x1B[';

export const ansi = {
  cursorUp: (count = 1) => (count > 0 ? ESC + count + 'A' : ''),
  cursorDown: (count = 1) => (count > 0 ? ESC + count + 'B' : ''),
  cursorRight: (count = 1) => (count > 0 ? ESC + count + 'C' : ''),
  cursorLeft: (count = 1) => (count > 0 ? ESC + count + 'D' : ''),
  cursorHome: ESC + 'H',

  eraseScreen: ESC + '2J',
  eraseSavedLines: ESC + '3J',
  eraseEndLine: ESC + 'K',
  eraseStartLine: ESC + '1K',

  styleReset: ESC + '1;0m',
  styleBoldRed: ESC + '1;31m',
  styleBoldGreen: ESC + '1;32m',
  styleBrightRed: ESC + '0;91m',
  styleBrightGreen: ESC + '0;92m',
  styleBrightYellow: ESC + '0;93m',
  styleBrightBlue: ESC + '0;94m',
  styleBrightPurple: ESC + '0;95m',
  styleBrightCyan: ESC + '0;96m',
  styleRed: ESC + '0;31m',
  styleGreen: ESC + '0;32m',
  styleYellow: ESC + '0;33m',
  styleBlue: ESC + '0;34m',
  stylePurple: ESC + '0;35m',
  styleCyan: ESC + '0;36m',
  showCursor: ESC + '?25h',
  hideCursor: ESC + '?25l'
};
