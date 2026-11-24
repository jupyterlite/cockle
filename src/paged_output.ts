import { ansi } from './ansi';
import { charWidth } from './char_width';
import {
  escapeSequenceAt,
  hyperlinkClose,
  hyperlinkUri,
  isControl,
  isSgr,
  isSupported,
  updateStyles
} from './escape_sequence';

const tabWidth = 8;

/**
 * Split a line into the supported escape sequences and printable characters that are displayed,
 * yielding each with the index of the screen row within the line that it is displayed on.
 * Unsupported escape sequences and control characters other than tab are not yielded.
 * A character that does not fit in the remainder of a row is moved to the start of the next row.
 */
function* layoutLine(
  line: string,
  columns: number
): Generator<{ text: string; isEscape: boolean; row: number }> {
  let row = 0;
  let column = 0;
  for (let i = 0; i < line.length; ) {
    if (line[i] === '\x1b') {
      const seq = escapeSequenceAt(line, i);
      i += seq.length;
      if (isSupported(seq)) {
        yield { text: seq, isEscape: true, row };
      }
      continue;
    }

    const codePoint = line.codePointAt(i)!;
    const char = String.fromCodePoint(codePoint);
    i += char.length;

    let width: number;
    if (char === '\t') {
      if (column >= columns) {
        row++;
        column = 0;
      }
      // Move to next tab stop, or the end of the row if there are no more tab stops.
      width = Math.min(tabWidth - (column % tabWidth), columns - column);
    } else if (isControl(codePoint)) {
      continue;
    } else {
      width = charWidth(codePoint);
    }

    if (width > 0 && column > 0 && column + width > columns) {
      row++;
      column = 0;
    }
    column += width;
    yield { text: char, isEscape: false, row };
  }
}

/**
 * Output text split into lines, and each line split into screen rows of a particular number of
 * columns. Escape sequences and zero width characters do not take up any columns, wide characters
 * such as CJK and emoji take up two columns.
 */
export class PagedOutput {
  constructor(columns?: number) {
    if (columns !== undefined) {
      this.setColumns(columns);
    }
  }

  append(text: string) {
    // text will never include *part* of an ansi escape sequence, they will always be complete.
    let index = 0;
    let stop = false;
    while (!stop) {
      const prevIndex = index;
      index = text.indexOf('\n', prevIndex) + 1;
      if (index === 0) {
        index = text.length;
      }
      const slice = text.slice(prevIndex, index);
      if (slice.length === 0) {
        stop = true;
      } else if (this._needsNewLine) {
        this._appendNewLine(slice);
      } else {
        this._appendToLastLine(slice);
      }
    }
  }

  clear() {
    this._lines = [];
    this._pagedLineOffsets = [0];
  }

  get columns(): number {
    return this._columns;
  }

  /**
   * Return the index of the first screen row of the specified line.
   */
  getLineFirstScreenRow(lineIndex: number): number {
    return this._pagedLineOffsets[lineIndex];
  }

  /**
   * Return the index of the line containing the specified screen row.
   */
  getLineIndex(screenRow: number): number {
    if (screenRow < 0 || screenRow >= this.pagedLineCount) {
      throw new Error('PagedOutput screenRow error');
    }

    // Binary search for the last line that starts at or before screenRow.
    let lo = 0;
    let hi = this._lines.length - 1;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (this._pagedLineOffsets[mid] <= screenRow) {
        lo = mid;
      } else {
        hi = mid - 1;
      }
    }
    return lo;
  }

  /**
   * Return the text of a single screen row, which starts with any styles and hyperlink that are
   * active at the start of the row and ends by resetting them. Does not end with \n.
   */
  getScreenRow(screenRow: number): string {
    const lineIndex = this.getLineIndex(screenRow);
    const row = screenRow - this._pagedLineOffsets[lineIndex];

    let styles: string[] = [];
    let hyperlink = '';
    let ret = '';
    let started = false;
    const begin = () => {
      if (!started) {
        started = true;
        ret = styles.join('') + hyperlink;
      }
    };

    for (const item of layoutLine(this._lines[lineIndex], this._columns)) {
      if (item.row > row) {
        break;
      }
      if (item.row === row) {
        begin();
        ret += item.text;
      }
      if (item.isEscape) {
        if (isSgr(item.text)) {
          styles = updateStyles(styles, item.text);
        } else {
          hyperlink = hyperlinkUri(item.text) === '' ? '' : item.text;
        }
      }
    }

    begin();
    if (styles.length > 0) {
      ret += ansi.styleReset;
    }
    if (hyperlink !== '') {
      ret += hyperlinkClose;
    }
    return ret;
  }

  get lineCount(): number {
    return this._lines.length;
  }

  get pagedLineCount(): number {
    return this._pagedLineOffsets.at(-1)!;
  }

  setColumns(columns: number) {
    const oldColumns = this._columns;
    this._columns = Math.max(columns, 1);

    if (this._columns !== oldColumns) {
      // Update cached paged line information.
      const n = this._lines.length;
      for (let i = 0; i < n; i++) {
        this._updatePagedLineOffset(i);
      }
    }
  }

  protected _appendNewLine(line: string) {
    // line may or may not end with \n, there will be no other \n in the line.
    this._lines.push(line);
    this._updatePagedLineOffset(this._lines.length - 1);
  }

  protected _appendToLastLine(partLine: string) {
    // partLine may or may not end with \n, there will be no other \n in the line.
    const lineIndex = this._lines.length - 1;
    this._lines[lineIndex] += partLine;
    this._updatePagedLineOffset(lineIndex);
  }

  /**
   * Whether the next text appended starts a new line, i.e. there are no lines or the last line is
   * complete.
   */
  protected get _needsNewLine(): boolean {
    return this._lines.at(-1)?.endsWith('\n') ?? true;
  }

  /**
   * Update the paged line offset for a particular output line index.
   * Invalidates but does not update all subsequent paged line offsets, so only call for the end
   * line (when appending output) or for all the lines in turn (when column size is changed).
   */
  private _updatePagedLineOffset(lineIndex: number) {
    if (lineIndex < 0 || lineIndex >= this._lines.length) {
      throw new Error('PagedOutput lineIndex error');
    }

    // An empty line still occupies one screen row.
    let rows = 1;
    for (const item of layoutLine(this._lines[lineIndex], this._columns)) {
      rows = item.row + 1;
    }

    if (this._pagedLineOffsets.length <= this._lines.length) {
      this._pagedLineOffsets.push(0);
    }
    this._pagedLineOffsets[lineIndex + 1] = this._pagedLineOffsets[lineIndex] + rows;
  }

  // Size of display.
  private _columns = 1;

  // All lines end with \n except the last which may not if it is not yet a complete line.
  protected _lines: string[] = [];

  // Each output line is one or more paged lines, this stores the offset index of each output line
  // into the notional array of paged lines.  It is an array one item longer than _lines.
  // The paged lines for output line index i go from _pagedLineOffsets[i] to _pagedLineOffsets[i+1].
  // First item is always zero, last item is the total number of paged lines.
  // It is entirely recalculated whenever `columns` is changed.
  protected _pagedLineOffsets: number[] = [0];
}
