import { describe, expect, test } from '@jest/globals';
import { ansi } from '../../src/ansi';
import type { ISize } from '../../src/callback';
import type { IAsyncInput, IOutput } from '../../src/io';
import { Pager } from '../../src/pager';
import type { IPosixSignalCallback } from '../../src/posix_signal';
import { PosixSignal } from '../../src/posix_signal';
import { Termios } from '../../src/termios';

const EL = ansi.eraseEndLine;

/**
 * Stdin that returns strings sent to it, waiting if there are none.
 */
class FakeStdin implements IAsyncInput {
  constructor(readonly terminal: boolean) {}

  isTerminal(): boolean {
    return this.terminal;
  }

  readAsync(maxChars: number | null): Promise<string> {
    if (this._queue.length > 0) {
      return Promise.resolve(this._queue.shift()!);
    }
    return new Promise(resolve => {
      this._waiting = resolve;
    });
  }

  send(text: string): void {
    if (this._waiting !== undefined) {
      const waiting = this._waiting;
      this._waiting = undefined;
      waiting(text);
    } else {
      this._queue.push(text);
    }
  }

  private _queue: string[] = [];
  private _waiting?: (text: string) => void;
}

/**
 * Stdout that records everything written to it.
 */
class FakeStdout implements IOutput {
  constructor(readonly terminal: boolean) {}

  flush(): void {}

  isTerminal(): boolean {
    return this.terminal;
  }

  supportsAnsiEscapes(): boolean {
    return this.terminal;
  }

  write(text: string): void {
    this.text += text;
  }

  text = '';
}

/**
 * Termios that records the flags set.
 */
class FakeTermios implements Termios.ITermios {
  get(): Termios.IFlags {
    return this.flags;
  }

  set(flags: Termios.IFlags): void {
    this.flags = flags;
    this.setCount++;
  }

  flags: Termios.IFlags = {
    c_iflag: 0 as Termios.InputFlag,
    c_oflag: 0 as Termios.OutputFlag,
    c_cflag: 0,
    c_lflag: Termios.LocalFlag.ICANON | Termios.LocalFlag.ECHO,
    c_cc: []
  };
  setCount = 0;
}

interface ISetupOptions {
  rows?: number;
  columns?: number;
  stdinIsTerminal?: boolean;
  stdoutIsTerminal?: boolean;
}

function setup(options: ISetupOptions = {}) {
  const size: ISize = { rows: options.rows ?? 4, columns: options.columns ?? 10 };
  const stdin = new FakeStdin(options.stdinIsTerminal ?? true);
  const stdout = new FakeStdout(options.stdoutIsTerminal ?? true);
  const termios = new FakeTermios();
  const originalFlags = termios.flags;
  let signalCallback: IPosixSignalCallback | undefined;

  const context = {
    stdin,
    stdout,
    size: () => ({ ...size }),
    termios,
    onPosixSignal: (callback: IPosixSignalCallback) => {
      signalCallback = callback;
    }
  };
  const pager = new Pager({ context });

  const resize = (rows: number, columns: number) => {
    size.rows = rows;
    size.columns = columns;
    signalCallback?.(PosixSignal.SIGWINCH);
  };

  // Send keys and wait for them to be processed.
  const send = async (text: string) => {
    stdin.send(text);
    await tick();
  };

  const hasSignalCallback = () => signalCallback !== undefined;

  return { pager, stdin, stdout, termios, originalFlags, resize, send, hasSignalCallback };
}

/**
 * Lines '0\n' to '9\n'.
 */
const tenLines = [...Array(10).keys()].map(i => `${i}\n`).join('');

/**
 * Expected output for rendering a page of rows followed by a prompt.
 */
function page(rows: string[], prompt: string): string {
  return rows.map(row => EL + row + '\n').join('') + EL + prompt;
}

function reverse(text: string): string {
  return ansi.styleReverse + text + ansi.styleReset;
}

function tick(): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, 0));
}

describe('Pager', () => {
  describe('pass through', () => {
    test('should pass output through if stdout is not a terminal', async () => {
      const { pager, stdout, termios, hasSignalCallback } = setup({ stdoutIsTerminal: false });
      const text = tenLines + 'a\x1b[2Jb\n';
      pager.write(text);
      expect(stdout.text).toEqual(text);
      await expect(pager.close()).resolves.toBeUndefined();
      expect(termios.setCount).toEqual(0);
      expect(hasSignalCallback()).toBe(false);
    });

    test('should pass output through if stdin is not a terminal', async () => {
      const { pager, stdout, termios } = setup({ stdinIsTerminal: false });
      pager.write(tenLines);
      expect(stdout.text).toEqual(tenLines);
      await expect(pager.close()).resolves.toBeUndefined();
      expect(termios.setCount).toEqual(0);
    });

    test('isTerminal and supportsAnsiEscapes should match stdout', () => {
      expect(setup().pager.isTerminal()).toBe(true);
      expect(setup().pager.supportsAnsiEscapes()).toBe(true);
      expect(setup({ stdoutIsTerminal: false }).pager.isTerminal()).toBe(false);
      expect(setup({ stdoutIsTerminal: false }).pager.supportsAnsiEscapes()).toBe(false);
    });
  });

  describe('direct output', () => {
    test('should write output that fits on a single page directly', async () => {
      const { pager, stdout, termios } = setup();
      pager.write('a\n');
      pager.write('b');
      pager.write('c\n');
      expect(stdout.text).toEqual('a\nbc\n');
      await expect(pager.close()).resolves.toBeUndefined();
      expect(termios.setCount).toEqual(0);
    });

    test('should remove unsupported escape sequences and control characters', () => {
      const { pager, stdout } = setup();
      pager.write('a\x1b[2Jb\r\n' + ansi.styleRed + 'c' + ansi.styleReset + '\n');
      expect(stdout.text).toEqual('ab\n' + ansi.styleRed + 'c' + ansi.styleReset + '\n');
    });

    test('should start paging when page is full', () => {
      const { pager, stdout, termios } = setup();
      pager.write('a\nb\nc\n');
      expect(stdout.text).toEqual('a\nb\nc\n');
      expect(pager['_mode']).toEqual('direct');

      stdout.text = '';
      pager.write('d\n');
      // Move up 3 rows to the start of the output and render first page.
      expect(stdout.text).toEqual('\r' + ansi.cursorUp(3) + page(['a', 'b', 'c'], ':'));
      expect(pager['_mode']).toEqual('paged');

      // Canonical mode and echo disabled.
      expect(termios.setCount).toEqual(1);
      expect(termios.flags.c_lflag & Termios.LocalFlag.ICANON).toEqual(0);
      expect(termios.flags.c_lflag & Termios.LocalFlag.ECHO).toEqual(0);
    });

    test('should start paging when page is full with incomplete last line', () => {
      const { pager, stdout } = setup();
      pager.write('a\nb\nc');
      expect(stdout.text).toEqual('a\nb\nc');

      stdout.text = '';
      pager.write('d\ne\n');
      // Cursor is on row of incomplete line so only move up 2 rows.
      expect(stdout.text).toEqual('\r' + ansi.cursorUp(2) + page(['a', 'b', 'cd'], ':'));
    });

    test('should start paging when a wrapped line fills the page', () => {
      const { pager, stdout } = setup({ columns: 4 });
      pager.write('a\n');
      stdout.text = '';
      pager.write('bbbbcccc\n');
      // Output of 3 rows fits, so written directly.
      expect(stdout.text).toEqual('bbbbcccc\n');

      stdout.text = '';
      pager.write('dddd\n');
      expect(stdout.text).toEqual('\r' + ansi.cursorUp(3) + page(['a', 'bbbb', 'cccc'], ':'));
    });
  });

  describe('paged output', () => {
    test('should scroll and render page', async () => {
      const { pager, stdout, send } = setup();
      pager.write(tenLines);
      stdout.text = '';

      await send('j');
      expect(pager['_topRow']).toEqual(1);
      expect(stdout.text).toEqual(ansi.cursorHome + page(['1', '2', '3'], ':') + '\r' + EL + ':');
    });

    test('should not render if position does not change', async () => {
      const { pager, stdout, send } = setup();
      pager.write(tenLines);
      stdout.text = '';

      await send('k');
      expect(pager['_topRow']).toEqual(0);
      expect(stdout.text).toEqual('\r' + EL + ':');
    });

    test('should buffer output that arrives whilst paging', async () => {
      const { pager, stdout, send } = setup();
      pager.write(tenLines);
      stdout.text = '';

      pager.write('10\n11\n');
      expect(stdout.text).toEqual('');

      await send('G');
      expect(pager['_topRow']).toEqual(9);
      expect(stdout.text).toEqual(ansi.cursorHome + page(['9', '10', '11'], ':') + '\r' + EL + ':');
    });

    test('should render empty rows after end of output', async () => {
      const { pager, stdout, resize } = setup();
      pager.write(tenLines);
      stdout.text = '';

      resize(20, 10);
      expect(stdout.text).toEqual(
        ansi.eraseScreen +
          ansi.cursorHome +
          page([...[...Array(10).keys()].map(i => `${i}`), ...Array(9).fill('')], ':')
      );
    });
  });

  describe('keys', () => {
    // 10 lines with 3 rows per page, so maximum top row is 7 and half page is 1 row.
    const keyTests: [string, string, number][] = [
      // [keys, description, expected top row]
      ['j', 'forward line', 1],
      ['e', 'forward line', 1],
      ['\x0e', 'forward line Ctrl-N', 1],
      ['\x05', 'forward line Ctrl-E', 1],
      ['\r', 'forward line CR', 1],
      ['\n', 'forward line LF', 1],
      ['\x1b[B', 'forward line down arrow', 1],
      ['\x1bOB', 'forward line down arrow SS3', 1],
      ['jjk', 'backward line', 1],
      ['jjy', 'backward line', 1],
      ['jj\x10', 'backward line Ctrl-P', 1],
      ['jj\x0b', 'backward line Ctrl-K', 1],
      ['jj\x19', 'backward line Ctrl-Y', 1],
      ['jj\x1b[A', 'backward line up arrow', 1],
      ['jj\x1bOA', 'backward line up arrow SS3', 1],
      ['k', 'backward line at top', 0],
      [' ', 'forward window', 3],
      ['f', 'forward window', 3],
      ['z', 'forward window', 3],
      ['\x06', 'forward window Ctrl-F', 3],
      ['\x16', 'forward window Ctrl-V', 3],
      ['\x1b ', 'forward window ESC-SPACE', 3],
      ['\x1b[6~', 'forward window PageDown', 3],
      ['   ', 'forward window at end', 7],
      ['  b', 'backward window', 3],
      ['  w', 'backward window', 3],
      ['  \x02', 'backward window Ctrl-B', 3],
      ['  \x1bv', 'backward window ESC-v', 3],
      ['  \x1b[5~', 'backward window PageUp', 3],
      ['d', 'forward half window', 1],
      ['\x04', 'forward half window Ctrl-D', 1],
      ['ddu', 'backward half window', 1],
      ['dd\x15', 'backward half window Ctrl-U', 1],
      ['G', 'last line', 7],
      ['>', 'last line', 7],
      ['\x1b>', 'last line ESC->', 7],
      ['\x1b[F', 'last line End', 7],
      ['\x1bOF', 'last line End SS3', 7],
      ['\x1b[4~', 'last line End', 7],
      ['Gg', 'first line', 0],
      ['G<', 'first line', 0],
      ['G\x1b<', 'first line ESC-<', 0],
      ['G\x1b[H', 'first line Home', 0],
      ['G\x1bOH', 'first line Home SS3', 0],
      ['G\x1b[1~', 'first line Home', 0],
      ['5j', 'forward N lines', 5],
      ['5j3k', 'backward N lines', 2],
      ['2 ', 'forward window N lines', 2],
      ['4f2b', 'backward window N lines', 2],
      ['2d', 'forward half window N lines', 2],
      ['4d3u', 'backward half window N lines', 1],
      ['4g', 'line N', 3],
      ['3G', 'line N', 2],
      ['99g', 'line N past end', 7],
      ['50p', 'percent', 5],
      ['20%', 'percent', 2],
      ['Gp', 'percent default', 0],
      ['12\x7fj', 'backspace in number', 1],
      ['5xj', 'number cleared by unknown key', 1],
      ['\x1b j', 'ESC-SPACE followed by another key', 4]
    ];

    test.each(keyTests)('%j %s', async (keys, description, expectedTopRow) => {
      const { pager, send } = setup();
      pager.write(tenLines);
      await send(keys);
      expect(pager['_topRow']).toEqual(expectedTopRow);
      expect(pager['_mode']).toEqual('paged');
    });

    test('should handle keys sent separately', async () => {
      const { pager, send } = setup();
      pager.write(tenLines);
      await send('1');
      await send('2');
      await send('\x7f');
      expect(pager['_prompt']()).toEqual(EL + '1');
      await send('j');
      expect(pager['_topRow']).toEqual(1);
      expect(pager['_prompt']()).toEqual(EL + ':');
    });

    test('should ring bell for unknown key', async () => {
      const { pager, stdout, send } = setup();
      pager.write(tenLines);
      stdout.text = '';
      await send('x');
      expect(stdout.text).toEqual('\x07\r' + EL + ':');
    });

    test('should repaint', async () => {
      for (const key of ['r', 'R', '\x12', '\x0c']) {
        const { pager, stdout, send } = setup();
        pager.write(tenLines);
        stdout.text = '';
        await send(key);
        expect(stdout.text).toEqual(
          ansi.eraseScreen + ansi.cursorHome + page(['0', '1', '2'], ':') + '\r' + EL + ':'
        );
      }
    });

    test('should show position information', async () => {
      for (const keys of ['=', '\x07', ':f']) {
        const { pager, send } = setup();
        pager.write(tenLines);
        await send(keys);
        expect(pager['_prompt']()).toEqual(EL + reverse('lines 1-3/10 30%'));

        await send('G');
        await send(keys);
        expect(pager['_prompt']()).toEqual(EL + reverse('lines 8-10/10 100%'));

        // Message removed by next key.
        await send('k');
        expect(pager['_prompt']()).toEqual(EL + ':');
      }
    });

    test('should show first key of two key command in prompt', async () => {
      const { pager, send } = setup();
      pager.write(tenLines);
      await send(':');
      expect(pager['_prompt']()).toEqual(EL + ':');
      await send('x');
      expect(pager['_mode']).toEqual('paged');

      await send('Z');
      expect(pager['_prompt']()).toEqual(EL + 'Z');
      await send('x');
      expect(pager['_mode']).toEqual('paged');
    });

    test('should ring bell for unknown second key', async () => {
      for (const keys of [':x', 'Zx']) {
        const { pager, stdout, send } = setup();
        pager.write(tenLines);
        stdout.text = '';
        await send(keys);
        expect(stdout.text).toEqual('\x07\r' + EL + ':');
      }
    });
  });

  describe('quit', () => {
    test.each(['q', 'Q', ':q', ':Q', 'ZZ'])('should quit using %j', async keys => {
      const { pager, stdout, termios, originalFlags, send } = setup();
      pager.write(tenLines);

      let closed = false;
      pager.close().then(() => {
        closed = true;
      });

      // Send keys separately to check two key commands across reads.
      for (const key of keys) {
        await tick();
        expect(closed).toBe(false);
        await send(key);
      }

      expect(closed).toBe(true);
      expect(pager['_mode']).toEqual('quit');
      expect(stdout.text.endsWith('\r' + EL)).toBe(true);

      // Termios restored.
      expect(termios.setCount).toEqual(2);
      expect(termios.flags).toBe(originalFlags);
    });

    test('hasQuit should be true only after quit', async () => {
      const { pager, send } = setup();
      expect(pager.hasQuit).toBe(false);
      pager.write(tenLines);
      expect(pager.hasQuit).toBe(false);
      await send('j');
      expect(pager.hasQuit).toBe(false);
      await send('q');
      expect(pager.hasQuit).toBe(true);
    });

    test('hasQuit should be false when passing output through', async () => {
      const { pager } = setup({ stdoutIsTerminal: false });
      pager.write(tenLines);
      await pager.close();
      expect(pager.hasQuit).toBe(false);
    });

    test('hasQuit should be false when all output fits on a single page', async () => {
      const { pager } = setup();
      pager.write('a\n');
      await pager.close();
      expect(pager.hasQuit).toBe(false);
    });

    test('should quit if stdin is closed', async () => {
      const { pager, termios, originalFlags, send } = setup();
      pager.write(tenLines);
      await send('');
      expect(pager['_mode']).toEqual('quit');
      expect(termios.flags).toBe(originalFlags);
      await expect(pager.close()).resolves.toBeUndefined();
    });

    test('should discard output written after quit', async () => {
      const { pager, stdout, send } = setup();
      pager.write(tenLines);
      await send('q');
      stdout.text = '';
      pager.write('more\n');
      expect(stdout.text).toEqual('');
    });

    test('should ignore keys after quit in same input', async () => {
      const { pager, send } = setup();
      pager.write(tenLines);
      await send('qj');
      expect(pager['_mode']).toEqual('quit');
      expect(pager['_topRow']).toEqual(0);
    });
  });

  describe('close', () => {
    test('should show (END) when closed and at end', async () => {
      const { pager, stdout, send } = setup();
      pager.write(tenLines);
      await send('G');
      expect(pager['_prompt']()).toEqual(EL + ':');

      stdout.text = '';
      pager.close();
      expect(stdout.text).toEqual('\r' + EL + reverse('(END)'));
    });

    test('should not show (END) when closed and not at end', async () => {
      const { pager, stdout, send } = setup();
      pager.write(tenLines);
      stdout.text = '';
      pager.close();
      expect(stdout.text).toEqual('\r' + EL + ':');

      stdout.text = '';
      await send('G');
      expect(stdout.text).toEqual(
        ansi.cursorHome + page(['7', '8', '9'], reverse('(END)')) + '\r' + EL + reverse('(END)')
      );
    });

    test('should return same promise if called more than once', async () => {
      const { pager, send } = setup();
      pager.write(tenLines);
      const promise = pager.close();
      expect(pager.close()).toBe(promise);
      await send('q');
      await expect(promise).resolves.toBeUndefined();
    });
  });

  describe('help', () => {
    test('should open and close help page', async () => {
      const { pager, stdout, send } = setup({ rows: 4, columns: 80 });
      pager.write(tenLines);
      await send('5j');
      expect(pager['_topRow']).toEqual(5);

      stdout.text = '';
      await send('h');
      expect(pager['_help']).toBeDefined();
      expect(pager['_topRow']).toEqual(0);
      expect(stdout.text.startsWith(ansi.eraseScreen + ansi.cursorHome)).toBe(true);
      expect(stdout.text).toContain('SUMMARY OF PAGER COMMANDS');
      expect(pager['_prompt']()).toEqual(EL + reverse('HELP -- press q when done'));

      // Movement keys work in help page.
      await send('G');
      expect(pager['_topRow']).toBeGreaterThan(0);
      expect(pager['_prompt']()).toEqual(EL + reverse('HELP -- END -- press q when done'));

      await send('q');
      expect(pager['_help']).toBeUndefined();
      expect(pager['_topRow']).toEqual(5);
      expect(pager['_mode']).toEqual('paged');
      expect(pager['_prompt']()).toEqual(EL + ':');
    });

    test.each(['H', 'h'])('should open help page using %j', async key => {
      const { pager, send } = setup({ columns: 80 });
      pager.write(tenLines);
      await send(key);
      expect(pager['_help']).toBeDefined();
    });

    test.each(['Q', ':q', ':Q', 'ZZ'])('should close help page using %j', async keys => {
      const { pager, send } = setup({ columns: 80 });
      pager.write(tenLines);
      await send('h');
      await send(keys);
      expect(pager['_help']).toBeUndefined();
      expect(pager['_mode']).toEqual('paged');
    });

    test('should ring bell for help key in help page', async () => {
      const { pager, stdout, send } = setup({ columns: 80 });
      pager.write(tenLines);
      await send('h');
      stdout.text = '';
      await send('h');
      expect(pager['_help']).toBeDefined();
      expect(stdout.text.startsWith('\x07')).toBe(true);
    });

    test('should show position information for help page', async () => {
      const { pager, send } = setup({ columns: 80 });
      pager.write(tenLines);
      await send('h');
      await send('=');
      expect(pager['_prompt']()).toMatch(/^.*lines 1-3\/\d+ \d+%.*$/);
    });

    test('should buffer output and show (END) after closing help page', async () => {
      const { pager, send } = setup({ columns: 80 });
      pager.write(tenLines);
      await send('G');
      await send('h');
      pager.write('10\n');
      pager.close();
      expect(pager['_prompt']()).toEqual(EL + reverse('HELP -- press q when done'));

      await send('q');
      expect(pager['_topRow']).toEqual(7);
      await send('G');
      expect(pager['_topRow']).toEqual(8);
      expect(pager['_prompt']()).toEqual(EL + reverse('(END)'));
    });
  });

  describe('resize', () => {
    test('should register POSIX signal callback', () => {
      const { hasSignalCallback } = setup();
      expect(hasSignalCallback()).toBe(true);
    });

    test('should start paging if output no longer fits', () => {
      const { pager, stdout, resize } = setup();
      pager.write('a\nb\nc\n');
      stdout.text = '';

      resize(3, 10);
      expect(pager['_mode']).toEqual('paged');
      expect(stdout.text).toEqual(
        ansi.eraseScreen + ansi.cursorHome + '\r' + page(['a', 'b'], ':')
      );
    });

    test('should not start paging if output still fits', () => {
      const { pager, stdout, resize } = setup();
      pager.write('a\nb\nc\n');
      stdout.text = '';

      resize(10, 10);
      expect(pager['_mode']).toEqual('direct');
      expect(stdout.text).toEqual('');
    });

    test('should not start paging after close', async () => {
      const { pager, stdout, resize } = setup();
      pager.write('a\nb\nc\n');
      await pager.close();
      stdout.text = '';

      resize(2, 10);
      expect(pager['_mode']).toEqual('direct');
      expect(stdout.text).toEqual('');
    });

    test('should keep same line at top of page', async () => {
      const { pager, stdout, send, resize } = setup({ columns: 4 });
      // First line wraps to 3 rows.
      pager.write('aaaabbbbcccc\n' + tenLines);
      await send('4j');
      expect(pager['_topRow']).toEqual(4);
      expect(pager['_topLine']).toEqual(2);

      stdout.text = '';
      resize(4, 12);
      // First line now fits in 1 row.
      expect(pager['_topRow']).toEqual(2);
      expect(pager['_topLine']).toEqual(2);
      expect(stdout.text).toEqual(ansi.eraseScreen + ansi.cursorHome + page(['1', '2', '3'], ':'));
    });

    test('should clamp top row when page gets bigger', async () => {
      const { pager, send, resize } = setup();
      pager.write(tenLines);
      await send('G');
      expect(pager['_topRow']).toEqual(7);

      resize(6, 10);
      expect(pager['_topRow']).toEqual(5);
    });

    test('should resize help page and restore output position when closed', async () => {
      const { pager, send, resize } = setup({ columns: 4 });
      pager.write('aaaabbbbcccc\n' + tenLines);
      await send('4j');
      await send('h');
      const helpRows = pager['_help']!.pagedLineCount;

      resize(4, 80);
      expect(pager['_help']!.columns).toEqual(80);
      expect(pager['_help']!.pagedLineCount).toBeLessThan(helpRows);

      await send('q');
      expect(pager['_topLine']).toEqual(2);
      expect(pager['_topRow']).toEqual(2);
    });
  });
});
