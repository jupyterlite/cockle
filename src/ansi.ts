/**
 * ANSI escape sequences.
 */

const ESC = '\x1B[';

export const ansi = {
  cursorUp: (count = 1) => (count > 0 ? ESC + count + 'A' : ''),
  cursorDown: (count = 1) => (count > 0 ? ESC + count + 'B' : ''),
  cursorRight: (count = 1) => (count > 0 ? ESC + count + 'C' : ''),
  cursorLeft: (count = 1) => (count > 0 ? ESC + count + 'D' : ''),

  eraseEndLine: ESC + 'K',
  eraseStartLine: ESC + '1K',

  styleReset: ESC + '1;0m',
  styleBoldRed: ESC + '1;31m',
  styleBoldGreen: ESC + '1;32m'
};
