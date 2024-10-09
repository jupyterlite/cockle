import { ansi } from './ansi';

/**
 * Find the longest string that starts all of the supplied strings.
 * startIndex is the index to start at, if you already know that the first startIndex characters
 * are identical.
 */
export function longestStartsWith(strings: string[], startIndex: number = 0): string {
  if (strings.length < 1) {
    return '';
  }
  const minLength = Math.min(...strings.map(str => str.length));
  const toMatch = strings[0];
  let index = startIndex;
  while (index < minLength && strings.every(str => str[index] === toMatch[index])) {
    index++;
  }
  return toMatch.slice(0, index);
}

/**
 * Arrange an array of strings into columns that fit within a columnWidth.
 * Each column is the same width.
 * Return an array of lines.
 */
export function toColumns(strings: string[], columnWidth: number): string[] {
  if (strings.length < 1) {
    return [];
  }

  if (columnWidth < 1) {
    // If don't know number of columns, use a single line which will be too long.
    return [strings.join('  ')];
  }

  const nstrings = strings.length;
  const gap = 2;
  const maxLength = Math.max(...strings.map(str => str.length));
  const ncols = Math.min(Math.floor(columnWidth / (maxLength + gap)), nstrings);
  const nrows = Math.ceil(nstrings / ncols);

  const lines = [];
  for (let row = 0; row < nrows; ++row) {
    let line = '';
    for (let col = 0; col < ncols; ++col) {
      const index = col * nrows + row;
      if (index >= nstrings) {
        continue;
      }
      const str = strings[index];
      line += str;
      if (index + nrows < nstrings) {
        line += ' '.repeat(maxLength + gap - str.length);
      }
    }
    lines.push(line);
  }
  return lines;
}

/**
 *
 */
export function* toTable(
  strings: string[][],
  nHeaderRows: number,
  simple: boolean = false,
  colorMap: Map<number, string> | null = null
): Generator<string> {
  // Should check each input line has the same number of items.
  // nHeaderRows <= nrows

  const nrows = strings.length;
  const ncols = strings[0].length;

  // Get column widths
  const widths = strings.map(row => row.map(str => str.length));
  const colWidths = Array(ncols).fill(0);
  for (let i = 0; i < nrows; i++) {
    for (let j = 0; j < ncols; j++) {
      colWidths[j] = Math.max(colWidths[j], widths[i][j]);
    }
  }

  function hLine(which: number): string {
    // 0 <= which < 2
    const starts = '╭├╰';
    const mids = '┬┼┴';
    const ends = '╮┤╯';
    let line = starts[which];
    for (let j = 0; j < ncols; j++) {
      line += '─'.repeat(colWidths[j] + 2);
      line += j < ncols - 1 ? mids[which] : ends[which];
    }
    return line;
  }

  if (!simple) {
    yield hLine(0);
  }

  for (let i = 0; i < nrows; i++) {
    const row = strings[i];
    let line = simple ? '' : '│ ';
    for (let j = 0; j < ncols; j++) {
      const color = colorMap?.get(j) || null;
      if (color) {
        line += color + row[j] + ansi.styleReset;
      } else {
        line += row[j];
      }
      line += ' '.repeat(colWidths[j] - row[j].length);
      if (simple) {
        line += '  ';
      } else {
        line += ' │ ';
      }
    }
    yield line;

    if (i === nHeaderRows - 1) {
      if (simple) {
        let line = '';
        for (let j = 0; j < ncols; j++) {
          line += '─'.repeat(colWidths[j]) + '  ';
        }
        yield line;
      } else if (i !== nrows - 1) {
        yield hLine(1);
      }
    }
  }

  if (!simple) {
    yield hLine(2);
  }
}
