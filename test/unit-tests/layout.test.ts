import type { IOutput } from '../../src/io';
import { BorderTable, Table } from '../../src/layout';

class MockOutput implements IOutput {
  constructor(isTerminal: boolean = false) {
    this._isTerminal = isTerminal;
  }

  flush() {}

  isTerminal(): boolean {
    return this._isTerminal;
  }

  supportsAnsiEscapes(): boolean {
    return this._isTerminal;
  }

  write(text: string): void {
    this.text.push(text);
  }

  private _isTerminal;
  text: string[] = [];
}

describe('Table', () => {
  test('should show header and normal rows', () => {
    const table = new Table();
    table.addHeaderRow(['h1', 'h2']);
    table.addRow(['r1', 'r2']);

    const output = new MockOutput();
    table.write(output);
    expect(output.text).toEqual(['h1  h2\n', '──────\n', 'r1  r2\n']);
  });

  test('should not show horizontal spacer if no header', () => {
    const table = new Table();
    table.addRow(['r1', 'r2']);

    const output = new MockOutput();
    table.write(output);
    expect(output.text).toEqual(['r1  r2\n']);
  });

  test('should show spacer at ends', () => {
    const table = new Table({ spacersAtEnds: true });
    table.addHeaderRow(['h1', 'h2']);
    table.addRow(['r1', 'r2']);

    const output = new MockOutput();
    table.write(output);
    expect(output.text).toEqual(['  h1  h2\n', '──────────\n', '  r1  r2\n']);
  });

  test('should support separatorSize', () => {
    const table = new Table({ spacerSize: 3, spacersAtEnds: true });
    table.addHeaderRow(['h1', 'h2']);
    table.addRow(['r1', 'r2']);

    const output = new MockOutput();
    table.write(output);
    expect(output.text).toEqual(['   h1   h2\n', '─────────────\n', '   r1   r2\n']);
  });

  test('should use max width for each column', () => {
    const table = new Table();
    table.addHeaderRow(['h', 'longHeader']);
    table.addRow(['longRow', 'r']);

    const output = new MockOutput();
    table.write(output);
    expect(output.text).toEqual(['h        longHeader\n', '───────────────────\n', 'longRow  r\n']);
  });

  test('should sort by single column', () => {
    const table = new Table({ sortByColumn: [1] });
    table.addRow(['a', 'z']);
    table.addRow(['c', 'x']);
    table.addRow(['b', 'y']);

    const output = new MockOutput();
    table.write(output);
    expect(output.text).toEqual(['c  x\n', 'b  y\n', 'a  z\n']);
  });

  test('should sort by multiple columns', () => {
    const table = new Table({ sortByColumn: [1, 0] });
    table.addRow(['n', 'z']);
    table.addRow(['c', 'y']);
    table.addRow(['b', 'y']);
    table.addRow(['n', 'x']);

    const output = new MockOutput();
    table.write(output, '');
    expect(output.text).toEqual(['n  x\n', 'b  y\n', 'c  y\n', 'n  z\n']);
  });

  test('should support multiple header rows', () => {
    const table = new Table();
    table.addHeaderRow(['h1', 'h2']);
    table.addHeaderRow(['h3', 'h4']);
    table.addRow(['r1', 'r2']);

    const output = new MockOutput();
    table.write(output);
    expect(output.text).toEqual(['h1  h2\n', 'h3  h4\n', '──────\n', 'r1  r2\n']);
  });

  test('should support missing items in headers and rows', () => {
    const table = new Table();
    table.addHeaderRow(['h1']);
    table.addHeaderRow(['h3', 'h4']);
    table.addRow(['r1', 'r2']);
    table.addRow(['r3']);

    const output = new MockOutput();
    table.write(output);
    expect(output.text).toEqual(['h1\n', 'h3  h4\n', '──────\n', 'r1  r2\n', 'r3\n']);
  });

  test('should support colored columns but not headers', () => {
    const table = new Table({ colorByColumn: Table.defaultColorByColumn() });
    table.addHeaderRow(['h1', 'h2', 'h3']);
    table.addRow(['r1', 'r2', 'r3']);

    const output = new MockOutput(true);
    table.write(output);
    expect(output.text).toEqual([
      'h1  h2  h3\n',
      '──────────\n',
      'r1  \x1B[0;94mr2\x1B[1;0m  \x1B[0;95mr3\x1B[1;0m\n'
    ]);
  });

  test('should not color empty cells', () => {
    const table = new Table({ colorByColumn: Table.defaultColorByColumn() });
    table.addHeaderRow(['h1', 'h2', 'h3']);
    table.addRow(['r1', 'r2', 'r3']);
    table.addRow(['r4']);

    const output = new MockOutput(true);
    table.write(output, '');
    expect(output.text).toEqual([
      'h1  h2  h3\n',
      '──────────\n',
      'r1  \x1B[0;94mr2\x1B[1;0m  \x1B[0;95mr3\x1B[1;0m\n',
      'r4\n'
    ]);
  });

  test('output shouuld support prefix and suffix', () => {
    const table = new Table();
    table.addHeaderRow(['h1', 'h2']);
    table.addRow(['r1', 'r2']);

    const output = new MockOutput();
    table.write(output, 'pre_', '_suf');
    expect(output.text).toEqual(['pre_h1  h2_suf', 'pre_──────_suf', 'pre_r1  r2_suf']);
  });
});

describe('BorderTable', () => {
  test('should show header and normal rows', () => {
    const table = new BorderTable();
    table.addHeaderRow(['h1', 'h2']);
    table.addRow(['r1', 'r2']);

    const output = new MockOutput();
    table.write(output);
    expect(output.text).toEqual([
      '╭────┬────╮\n',
      '│ h1 │ h2 │\n',
      '├────┼────┤\n',
      '│ r1 │ r2 │\n',
      '╰────┴────╯\n'
    ]);
  });

  test('should not show horizontal spacer if no header', () => {
    const table = new BorderTable();
    table.addRow(['r1', 'r2']);

    const output = new MockOutput();
    table.write(output);
    expect(output.text).toEqual(['╭────┬────╮\n', '│ r1 │ r2 │\n', '╰────┴────╯\n']);
  });

  test('should use max width for each column', () => {
    const table = new BorderTable();
    table.addHeaderRow(['h', 'longHeader']);
    table.addRow(['longRow', 'r']);

    const output = new MockOutput();
    table.write(output);
    expect(output.text).toEqual([
      '╭─────────┬────────────╮\n',
      '│ h       │ longHeader │\n',
      '├─────────┼────────────┤\n',
      '│ longRow │ r          │\n',
      '╰─────────┴────────────╯\n'
    ]);
  });

  test('should sort by single column', () => {
    const table = new BorderTable({ sortByColumn: [1] });
    table.addRow(['a', 'z']);
    table.addRow(['c', 'x']);
    table.addRow(['b', 'y']);

    const output = new MockOutput();
    table.write(output, '');
    expect(output.text).toEqual([
      '╭───┬───╮\n',
      '│ c │ x │\n',
      '│ b │ y │\n',
      '│ a │ z │\n',
      '╰───┴───╯\n'
    ]);
  });

  test('should sort by multiple columns', () => {
    const table = new BorderTable({ sortByColumn: [1, 0] });
    table.addRow(['n', 'z']);
    table.addRow(['c', 'y']);
    table.addRow(['b', 'y']);
    table.addRow(['n', 'x']);

    const output = new MockOutput();
    table.write(output);
    expect(output.text).toEqual([
      '╭───┬───╮\n',
      '│ n │ x │\n',
      '│ b │ y │\n',
      '│ c │ y │\n',
      '│ n │ z │\n',
      '╰───┴───╯\n'
    ]);
  });

  test('should support multiple header rows', () => {
    const table = new BorderTable();
    table.addHeaderRow(['h1', 'h2']);
    table.addHeaderRow(['h3', 'h4']);
    table.addRow(['r1', 'r2']);

    const output = new MockOutput();
    table.write(output, '');
    expect(output.text).toEqual([
      '╭────┬────╮\n',
      '│ h1 │ h2 │\n',
      '│ h3 │ h4 │\n',
      '├────┼────┤\n',
      '│ r1 │ r2 │\n',
      '╰────┴────╯\n'
    ]);
  });

  test('should support missing items in headers and rows', () => {
    const table = new BorderTable();
    table.addHeaderRow(['h1']);
    table.addHeaderRow(['h3', 'h4']);
    table.addRow(['r1', 'r2']);
    table.addRow(['r3']);

    const output = new MockOutput();
    table.write(output);
    expect(output.text).toEqual([
      '╭────┬────╮\n',
      '│ h1 │    │\n',
      '│ h3 │ h4 │\n',
      '├────┼────┤\n',
      '│ r1 │ r2 │\n',
      '│ r3 │    │\n',
      '╰────┴────╯\n'
    ]);
  });

  test('should support colored columns but not headers', () => {
    const table = new BorderTable({ colorByColumn: BorderTable.defaultColorByColumn() });
    table.addHeaderRow(['h1', 'h2', 'h3']);
    table.addRow(['r1', 'r2', 'r3']);

    const output = new MockOutput(true);
    table.write(output);
    expect(output.text).toEqual([
      '╭────┬────┬────╮\n',
      '│ h1 │ h2 │ h3 │\n',
      '├────┼────┼────┤\n',
      '│ r1 │ \x1B[0;94mr2\x1B[1;0m │ \x1B[0;95mr3\x1B[1;0m │\n',
      '╰────┴────┴────╯\n'
    ]);
  });

  test('should not color empty cells', () => {
    const table = new BorderTable({ colorByColumn: BorderTable.defaultColorByColumn() });
    table.addHeaderRow(['h1', 'h2', 'h3']);
    table.addRow(['r1', 'r2', 'r3']);
    table.addRow(['r4']);

    const output = new MockOutput(true);
    table.write(output);
    expect(output.text).toEqual([
      '╭────┬────┬────╮\n',
      '│ h1 │ h2 │ h3 │\n',
      '├────┼────┼────┤\n',
      '│ r1 │ \x1B[0;94mr2\x1B[1;0m │ \x1B[0;95mr3\x1B[1;0m │\n',
      '│ r4 │    │    │\n',
      '╰────┴────┴────╯\n'
    ]);
  });

  test('output should support prefix and suffix', () => {
    const table = new BorderTable();
    table.addHeaderRow(['h1', 'h2']);
    table.addRow(['r1', 'r2']);

    const output = new MockOutput();
    table.write(output, 'pre_', '_suf');
    expect(output.text).toEqual([
      'pre_╭────┬────╮_suf',
      'pre_│ h1 │ h2 │_suf',
      'pre_├────┼────┤_suf',
      'pre_│ r1 │ r2 │_suf',
      'pre_╰────┴────╯_suf'
    ]);
  });
});
