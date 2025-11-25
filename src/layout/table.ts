import { ansi } from '../ansi';
import type { IOutput } from '../io';
import { rtrim } from '../utils';

/**
 * Type of horizontal spacer, such as between the header and rows.
 */
export enum HorizontalSpacerType {
  TOP = 0,
  MIDDLE = 1,
  BOTTOM = 2
}

/**
 * Type of vertical spacer used between adjacent columns in the same row.
 */
export enum VerticalSpacerType {
  LEFT = 0,
  INNER = 1,
  RIGHT = 2
}

/**
 * Abstract base class for table which displays a 2D grid of headers and rows with each column sized
 * to fit its longest item. The number of columns is given by the maximum number of items in all
 * rows ahd header rows; rows with fewer items are right-padded with empty strings. It does not
 * care about terminal width or height, so may overrun in width and take up more than page.
 */
abstract class BaseTable {
  constructor(readonly options: BaseTable.IOptions) {}

  addHeaderRow(headerRow: string[]) {
    this._headerRows.push(headerRow);
    this._updateColumnWidths(headerRow);
  }

  addRow(row: string[]) {
    this._rows.push(row);
    this._updateColumnWidths(row);
  }

  /**
   * Return a default colorByColumn map for clients that want to color columns but don't want to
   * define their own.
   */
  static defaultColorByColumn(): Map<number, string> {
    return new Map([
      [1, ansi.styleBrightBlue],
      [2, ansi.styleBrightPurple],
      [3, ansi.styleGreen],
      [4, ansi.styleYellow]
    ]);
  }

  /**
   * Generator for output lines, one at a time.
   * @param prefix String to insert at beginning of each line, default ''.
   * @param suffix String to append to end of each line, default ''.
   */
  *lines(prefix: string = '', suffix: string = ''): Generator<string> {
    const { sortByColumn } = this.options;
    if (sortByColumn !== undefined) {
      // Sort rows in place.
      const compareColumn = (columnIndex: number, a: string[], b: string[]) => {
        const sortColumn = sortByColumn[columnIndex];
        if (a[sortColumn] < b[sortColumn]) {
          return -1;
        } else if (a[sortColumn] > b[sortColumn]) {
          return 1;
        } else if (sortByColumn.length > columnIndex + 1) {
          // This column matches, sort by next column.
          return compareColumn(columnIndex + 1, a, b);
        }
        return 0;
      };
      this._rows.sort((a, b) => compareColumn(0, a, b));
    }

    const nColumns = this._columnWidths.length;

    const topSpacer = this.horizontalSpacer(HorizontalSpacerType.TOP);
    if (topSpacer !== undefined) {
      yield prefix + rtrim(topSpacer) + suffix;
    }

    for (const headerRow of this._headerRows) {
      let line = '';
      for (let i = 0; i < nColumns; i++) {
        line += this.verticalSpacer(i === 0 ? VerticalSpacerType.LEFT : VerticalSpacerType.INNER);
        const item = headerRow[i] ?? '';
        line += item + ' '.repeat(this._columnWidths[i] - item.length);
      }
      line += this.verticalSpacer(VerticalSpacerType.RIGHT);
      yield prefix + rtrim(line) + suffix;
    }
    if (this._headerRows.length > 0) {
      const middleSpacer = this.horizontalSpacer(HorizontalSpacerType.MIDDLE);
      if (middleSpacer !== undefined) {
        yield prefix + rtrim(middleSpacer) + suffix;
      }
    }
    for (const row of this._rows) {
      let line = '';
      for (let i = 0; i < nColumns; i++) {
        line += this.verticalSpacer(i === 0 ? VerticalSpacerType.LEFT : VerticalSpacerType.INNER);
        const item = row[i] ?? '';
        if (item) {
          const color = this.options.colorByColumn?.get(i);
          line += color !== undefined ? color + item + ansi.styleReset : item;
        }
        line += ' '.repeat(this._columnWidths[i] - item.length);
      }
      line += this.verticalSpacer(VerticalSpacerType.RIGHT);
      yield prefix + rtrim(line) + suffix;
    }

    const bottomSpacer = this.horizontalSpacer(HorizontalSpacerType.BOTTOM);
    if (bottomSpacer !== undefined) {
      yield prefix + rtrim(bottomSpacer) + suffix;
    }
  }

  /**
   * Return horizontal spacer, such as between the header and rows, or undefined if there is no
   * such spacer.
   */
  protected abstract horizontalSpacer(type: HorizontalSpacerType): string | undefined;

  /**
   * Returns number of rows in body of table. Does not include header rows.
   */
  get rowCount(): number {
    return this._rows.length;
  }

  /**
   * Return vertical spacer, i.e. spacer between adjacent columns in the same row.
   */
  protected abstract verticalSpacer(type: VerticalSpacerType): string;

  /**
   * Write table to output.
   * @param output Output to write to.
   * @param prefix String to insert at beginning of each line, default ''.
   * @param suffix String to append to end of each line, default '\n'.
   */
  write(output: IOutput, prefix: string = '', suffix: string = '\n') {
    for (const line of this.lines(prefix, suffix)) {
      output.write(line);
    }
  }

  private _updateColumnWidths(row: string[]) {
    const widths = row.map(str => str.length);
    const n = Math.min(this._columnWidths.length, widths.length);
    for (let i = 0; i < n; i++) {
      this._columnWidths[i] = Math.max(this._columnWidths[i], widths[i]);
    }
    if (widths.length > n) {
      this._columnWidths.push(...widths.slice(n));
    }
  }

  protected _columnWidths: number[] = [];
  private _headerRows: string[][] = [];
  private _rows: string[][] = [];
}

/**
 * Simple table with horizontal line between header and rows such as:
 *
 * header1  header2
 * ────────────────
 * aaaa     bbb
 * cc       dd
 */
export class Table extends BaseTable {
  constructor(options: Table.IOptions = {}) {
    super(options);
    const separatorSize = options.spacerSize ?? 2;
    this._spacer = ' '.repeat(separatorSize);
    this._spacersAtEnds = options.spacersAtEnds ?? false;
  }

  protected horizontalSpacer(type: HorizontalSpacerType): string | undefined {
    if (type === HorizontalSpacerType.MIDDLE) {
      const totalWidth =
        this._columnWidths.reduce((acc, value) => acc + value) + this._totalSeparatorSize();
      return '─'.repeat(totalWidth);
    }
    return undefined;
  }

  protected verticalSpacer(type: VerticalSpacerType): string {
    if (type === VerticalSpacerType.INNER || this._spacersAtEnds) {
      return this._spacer;
    }
    return '';
  }

  private _totalSeparatorSize(): number {
    let nSpacers = this._columnWidths.length - 1;
    if (this._spacersAtEnds) {
      nSpacers += 2;
    }
    return nSpacers * this._spacer.length;
  }

  private _spacer: string;
  private _spacersAtEnds: boolean;
}

/**
 * Table with border such as:
 *
 * ╭─────────┬─────────╮",
 * │ header1 │ header2 │",
 * ├─────────┼─────────┤",
 * │ aaaa    │ bbb     │",
 * │ cc      │ d       │",
 * ╰─────────┴─────────╯",
 */
export class BorderTable extends BaseTable {
  constructor(options: BorderTable.IOptions = {}) {
    super(options);
  }

  protected horizontalSpacer(type: HorizontalSpacerType): string | undefined {
    const spacerChars = (type: HorizontalSpacerType) => {
      switch (type) {
        case HorizontalSpacerType.TOP:
          return '╭┬╮';
        case HorizontalSpacerType.MIDDLE:
          return '├┼┤';
        case HorizontalSpacerType.BOTTOM:
          return '╰┴╯';
      }
    };
    const chars = spacerChars(type);
    return chars[0] + this._columnWidths.map(w => '─'.repeat(w + 2)).join(chars[1]) + chars[2];
  }

  protected verticalSpacer(type: VerticalSpacerType): string {
    if (type === VerticalSpacerType.LEFT) {
      return '│ ';
    } else if (type === VerticalSpacerType.RIGHT) {
      return ' │';
    }
    return ' │ ';
  }
}

export namespace BaseTable {
  export interface IOptions {
    colorByColumn?: Map<number, string>;
    sortByColumn?: number[]; // Indices of columns to sort by.
    // TODO: add column justification.
  }
}

export namespace Table {
  export interface IOptions extends BaseTable.IOptions {
    spacerSize?: number; // Default is 2
    spacersAtEnds?: boolean; // Default is false
  }
}

export namespace BorderTable {
  export interface IOptions extends BaseTable.IOptions {
    // TODO: border style such as rounded, square, double lines, etc?
  }
}
