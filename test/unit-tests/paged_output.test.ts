import { describe, expect, test } from '@jest/globals';
import { ansi } from '../../src/ansi';
import { charWidth } from '../../src/char_width';
import {
  escapeSequenceAt,
  isIncompleteEscapeSequenceAt,
  removeUnsupported
} from '../../src/escape_sequence';
import { PagedOutput } from '../../src/paged_output';

describe('PagedOutput', () => {
  test('append text without ansi codes', () => {
    const p = new PagedOutput();
    expect(p['_lines']).toEqual([]);

    p.append('hello\ngoodbye\n');
    expect(p['_lines']).toEqual(['hello\n', 'goodbye\n']);

    p.clear();
    p.append('hello\ngoodbye');
    expect(p['_lines']).toEqual(['hello\n', 'goodbye']);

    p.clear();
    p.append('hello\ngood');
    p.append('bye');
    expect(p['_lines']).toEqual(['hello\n', 'goodbye']);

    p.clear();
    p.append('hell');
    p.append('o\ng');
    p.append('ood');
    p.append('bye');
    expect(p['_lines']).toEqual(['hello\n', 'goodbye']);

    p.clear();
    p.append('');
    expect(p['_lines']).toEqual([]);

    p.clear();
    p.append('\n');
    expect(p['_lines']).toEqual(['\n']);

    p.clear();
    p.append('\n\n\n');
    expect(p['_lines']).toEqual(['\n', '\n', '\n']);

    p.clear();
    p.append('\na\nb\nc');
    expect(p['_lines']).toEqual(['\n', 'a\n', 'b\n', 'c']);
  });

  test('append text with ansi codes', () => {
    const p = new PagedOutput();
    p.append('a' + ansi.styleRed + 'red' + ansi.styleReset + 'b\n');
    expect(p['_lines']).toEqual(['a\x1B[0;31mred\x1B[1;0mb\n']);
  });

  test('paged line indices without ansi codes', () => {
    const p = new PagedOutput(10);
    p.append('abcdef\n0123456789\n');
    expect(p['_pagedLineOffsets']).toEqual([0, 1, 2]);

    p.setColumns(6);
    expect(p['_pagedLineOffsets']).toEqual([0, 1, 3]);

    p.setColumns(5);
    expect(p['_pagedLineOffsets']).toEqual([0, 2, 4]);

    p.setColumns(4);
    expect(p['_pagedLineOffsets']).toEqual([0, 2, 5]);

    p.setColumns(3);
    expect(p['_pagedLineOffsets']).toEqual([0, 2, 6]);

    p.setColumns(2);
    expect(p['_pagedLineOffsets']).toEqual([0, 3, 8]);

    p.setColumns(1);
    expect(p['_pagedLineOffsets']).toEqual([0, 6, 16]);
  });

  test('paged line indices with ansi codes', () => {
    const p = new PagedOutput(10);
    p.append('a' + ansi.styleRed + 'red' + ansi.styleReset + 'b\n');
    expect(p['_pagedLineOffsets']).toEqual([0, 1]);

    p.setColumns(3);
    expect(p['_pagedLineOffsets']).toEqual([0, 2]);

    p.setColumns(2);
    expect(p['_pagedLineOffsets']).toEqual([0, 3]);

    p.setColumns(5);
    expect(p['_pagedLineOffsets']).toEqual([0, 1]);
  });

  test('paged line indices with empty lines', () => {
    const p = new PagedOutput(10);
    p.append('\n\nab\n');
    expect(p['_pagedLineOffsets']).toEqual([0, 1, 2, 3]);
  });

  test('getLineIndex', () => {
    const p = new PagedOutput(4);
    p.append('abcdef\n\nxy\n');
    expect(p['_pagedLineOffsets']).toEqual([0, 2, 3, 4]);
    expect(p.getLineIndex(0)).toEqual(0);
    expect(p.getLineIndex(1)).toEqual(0);
    expect(p.getLineIndex(2)).toEqual(1);
    expect(p.getLineIndex(3)).toEqual(2);
    expect(() => p.getLineIndex(-1)).toThrow();
    expect(() => p.getLineIndex(4)).toThrow();
  });

  test('getScreenRow without ansi codes', () => {
    const p = new PagedOutput(4);
    p.append('abcdef\n\nxy');
    expect(p.getScreenRow(0)).toEqual('abcd');
    expect(p.getScreenRow(1)).toEqual('ef');
    expect(p.getScreenRow(2)).toEqual('');
    expect(p.getScreenRow(3)).toEqual('xy');
  });

  test('getScreenRow with style spanning wrap', () => {
    const p = new PagedOutput(3);
    p.append('a' + ansi.styleRed + 'bcd' + ansi.styleReset + 'e\n');
    expect(p.getScreenRow(0)).toEqual('a' + ansi.styleRed + 'bc' + ansi.styleReset);
    expect(p.getScreenRow(1)).toEqual(ansi.styleRed + 'd' + ansi.styleReset + 'e');
  });

  test('getScreenRow with extended color containing zeros', () => {
    const p = new PagedOutput(1);
    const black = ansi.styleRGB(0, 0, 0);
    p.append(black + 'ab\n');
    expect(p.getScreenRow(0)).toEqual(black + 'a' + ansi.styleReset);
    expect(p.getScreenRow(1)).toEqual(black + 'b' + ansi.styleReset);
  });

  test('getScreenRow with hyperlink spanning wrap', () => {
    const open = '\x1b]8;;http://x\x1b\\';
    const close = '\x1b]8;;\x1b\\';
    const p = new PagedOutput(2);
    p.append(open + 'abc' + close + '\n');
    expect(p.getScreenRow(0)).toEqual(open + 'ab' + close);
    expect(p.getScreenRow(1)).toEqual(open + 'c' + close);
  });

  test('unsupported escape sequences', () => {
    const text = 'a\x1b[2Jb\x1b]0;title\x07c\n';
    expect(removeUnsupported(text)).toEqual('abc\n');

    const p = new PagedOutput(10);
    p.append(text);
    expect(p['_lines']).toEqual([text]);
    expect(p.getScreenRow(0)).toEqual('abc');
  });

  test('escapeSequenceAt', () => {
    expect(escapeSequenceAt('\x1b[Ax', 0)).toEqual('\x1b[A');
    expect(escapeSequenceAt('\x1bOBx', 0)).toEqual('\x1bOB');
    expect(escapeSequenceAt('x\x1b[1;31mx', 1)).toEqual('\x1b[1;31m');
    expect(escapeSequenceAt('\x1b]8;;http://x\x07x', 0)).toEqual('\x1b]8;;http://x\x07');
    expect(escapeSequenceAt('x\x1b', 1)).toEqual('\x1b');
  });

  test('isIncompleteEscapeSequenceAt', () => {
    expect(isIncompleteEscapeSequenceAt('x\x1b', 1)).toBe(true);
    expect(isIncompleteEscapeSequenceAt('\x1b[1;3', 0)).toBe(true);
    expect(isIncompleteEscapeSequenceAt('\x1b]8;;http://x', 0)).toBe(true);
    expect(isIncompleteEscapeSequenceAt('\x1b]8;;http://x\x1b', 0)).toBe(true);
    expect(isIncompleteEscapeSequenceAt('\x1bO', 0)).toBe(true);
    expect(isIncompleteEscapeSequenceAt('\x1b(', 0)).toBe(true);
    expect(isIncompleteEscapeSequenceAt('\x1b[1;31m', 0)).toBe(false);
    expect(isIncompleteEscapeSequenceAt('\x1b[1;3x\x1b[0m', 0)).toBe(false);
    expect(isIncompleteEscapeSequenceAt('\x1b\n', 0)).toBe(false);
  });

  test('charWidth', () => {
    expect(charWidth(0x61)).toEqual(1); // a
    expect(charWidth(0xad)).toEqual(1); // Soft hyphen
    expect(charWidth(0x4e2d)).toEqual(2); // CJK
    expect(charWidth(0xff21)).toEqual(2); // Fullwidth A
    expect(charWidth(0x1f600)).toEqual(2); // Emoji
    expect(charWidth(0x301)).toEqual(0); // Combining acute accent
    expect(charWidth(0x200d)).toEqual(0); // Zero width joiner
    expect(charWidth(0xfe0f)).toEqual(0); // Variation selector
  });

  test('wide characters', () => {
    const p = new PagedOutput(5);
    p.append('中文字\n');
    expect(p['_pagedLineOffsets']).toEqual([0, 2]);
    expect(p.getScreenRow(0)).toEqual('中文');
    expect(p.getScreenRow(1)).toEqual('字');

    p.setColumns(4);
    expect(p['_pagedLineOffsets']).toEqual([0, 2]);
    expect(p.getScreenRow(0)).toEqual('中文');
    expect(p.getScreenRow(1)).toEqual('字');

    p.setColumns(1);
    expect(p['_pagedLineOffsets']).toEqual([0, 3]);
  });

  test('emoji', () => {
    const p = new PagedOutput(3);
    p.append('😀😀x\n');
    expect(p['_pagedLineOffsets']).toEqual([0, 2]);
    expect(p.getScreenRow(0)).toEqual('😀');
    expect(p.getScreenRow(1)).toEqual('😀x');
  });

  test('combining characters', () => {
    const p = new PagedOutput(3);
    p.append('éabc\n');
    expect(p['_pagedLineOffsets']).toEqual([0, 2]);
    expect(p.getScreenRow(0)).toEqual('éab');
    expect(p.getScreenRow(1)).toEqual('c');
  });

  test('tabs', () => {
    const p = new PagedOutput(20);
    p.append('a\tb\n');
    expect(p['_pagedLineOffsets']).toEqual([0, 1]);
    expect(p.getScreenRow(0)).toEqual('a\tb');

    // Tab stops at end of row.
    p.clear();
    p.append('x'.repeat(18) + '\tb\n');
    expect(p['_pagedLineOffsets']).toEqual([0, 2]);
    expect(p.getScreenRow(0)).toEqual('x'.repeat(18) + '\t');
    expect(p.getScreenRow(1)).toEqual('b');

    // Tab after full row moves to next row.
    p.clear();
    p.append('x'.repeat(20) + '\tb\n');
    expect(p['_pagedLineOffsets']).toEqual([0, 2]);
    expect(p.getScreenRow(0)).toEqual('x'.repeat(20));
    expect(p.getScreenRow(1)).toEqual('\tb');
  });

  test('carriage returns and control characters', () => {
    const text = 'ab\r\ncd\x07e\bf\n';
    expect(removeUnsupported(text)).toEqual('ab\ncdef\n');

    const p = new PagedOutput(10);
    p.append(text);
    expect(p['_pagedLineOffsets']).toEqual([0, 1, 2]);
    expect(p.getScreenRow(0)).toEqual('ab');
    expect(p.getScreenRow(1)).toEqual('cdef');
  });
});
