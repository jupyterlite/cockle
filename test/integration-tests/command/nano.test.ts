import { expect } from '@playwright/test';
import { shellLineSimple, test } from '../utils';

test.describe('nano command', () => {
  test('should output version', async ({ page }) => {
    const output = await shellLineSimple(page, 'nano --version');
    expect(output).toMatch(/^nano --version\r\n GNU nano, version 8.6\r\n/);
  });

  const stdinOptions = ['sab', 'sw'];
  stdinOptions.forEach(stdinOption => {
    test(`should open and close using ${stdinOption}`, async ({ page }) => {
      await page.evaluate(async stdinOption => {
        const { shellSetupEmpty, terminalInput } = globalThis.cockle;
        const { shell } = await shellSetupEmpty({ color: true, stdinOption });
        const exit = '\x18'; // Ctrl-X
        const cmd = shell.inputLine('nano');
        await terminalInput(shell, [exit]);
        await cmd;
      }, stdinOption);
      // If nano does not close, test will timeout.
    });

    test(`should create new file using ${stdinOption}`, async ({ page }) => {
      const output = await page.evaluate(async stdinOption => {
        const { keys, shellSetupEmpty, terminalInput } = globalThis.cockle;
        const { shell, output } = await shellSetupEmpty({ color: true, stdinOption });
        const { enter } = keys;
        const exit = '\x18'; // Ctrl-X
        const writeFile = '\x0f'; // Ctrl-O
        const cmd = shell.inputLine('nano');
        await terminalInput(shell, [
          'a',
          'b',
          'c',
          enter,
          'd',
          'e',
          'f',
          writeFile,
          'o',
          'u',
          't',
          enter,
          exit
        ]);
        await cmd;
        // New file should exist.
        output.clear();
        await shell.inputLine('cat out');
        return output.text;
      }, stdinOption);
      expect(output).toMatch(/^cat out\r\nabc\r\ndef\r\n/);
    });

    test(`should add to existing file using ${stdinOption}`, async ({ page }) => {
      const output = await page.evaluate(async stdinOption => {
        const { keys, shellSetupSimple, terminalInput } = globalThis.cockle;
        const { shell, output } = await shellSetupSimple({ color: true, stdinOption });
        const { downArrow, enter } = keys;
        const exit = '\x18'; // Ctrl-X
        const writeFile = '\x0f'; // Ctrl-O
        const cmd = shell.inputLine('nano file2');
        await terminalInput(shell, [downArrow, 'N', 'e', 'w', enter, writeFile, enter, exit]);
        await cmd;
        output.clear();
        await shell.inputLine('cat file2');
        return output.text;
      }, stdinOption);
      expect(output).toMatch(/^cat file2\r\nSome other file\r\nNew\r\nSecond line\r\n/);
    });

    test(`should delete from existing file using ${stdinOption}`, async ({ page }) => {
      const output = await page.evaluate(async stdinOption => {
        const { keys, shellSetupSimple, terminalInput } = globalThis.cockle;
        const { shell, output } = await shellSetupSimple({ color: true, stdinOption });
        const { enter } = keys;
        const deleteLine = '\x0b'; // Ctrl-K
        const exit = '\x18'; // Ctrl-X
        const writeFile = '\x0f'; // Ctrl-O
        const cmd = shell.inputLine('nano file2');
        // Delete first line of file, leaving just the second line.
        await terminalInput(shell, [deleteLine, writeFile, enter, exit]);
        await cmd;
        output.clear();
        await shell.inputLine('cat file2');
        return output.text;
      }, stdinOption);
      expect(output).toMatch(/^cat file2\r\nSecond line\r\n/);
    });

    test(`should support backspace using ${stdinOption}`, async ({ page }) => {
      const output = await page.evaluate(async stdinOption => {
        const { keys, shellSetupSimple, terminalInput } = globalThis.cockle;
        const { shell, output } = await shellSetupSimple({ color: true, stdinOption });
        const { backspace, enter, leftArrow } = keys;
        const endOfLine = '\x05'; // Ctrl-E
        const exit = '\x18'; // Ctrl-X
        const writeFile = '\x0f'; // Ctrl-O
        const cmd = shell.inputLine('nano file1');
        await terminalInput(shell, [
          endOfLine,
          'Z',
          leftArrow,
          leftArrow,
          backspace,
          'L',
          writeFile,
          enter,
          exit
        ]);
        await cmd;
        output.clear();
        await shell.inputLine('cat file1');
        return output.text;
      }, stdinOption);
      expect(output).toMatch(/^cat file1\r\nContents of the fiLeZ\r\n/);
    });

    test(`should support backspace when saving filename using ${stdinOption}`, async ({ page }) => {
      const output = await page.evaluate(async stdinOption => {
        const { keys, shellSetupSimple, terminalInput } = globalThis.cockle;
        const { shell, output } = await shellSetupSimple({ color: true, stdinOption });
        const { backspace, enter } = keys;
        const exit = '\x18'; // Ctrl-X
        const writeFile = '\x0f'; // Ctrl-O
        const cmd = shell.inputLine('nano');
        await terminalInput(shell, [
          ...('AZ' + writeFile + 'a.tZ' + backspace + 'xt' + enter + exit)
        ]);
        await cmd;
        output.clear();
        await shell.inputLine('cat a.txt');
        return output.text;
      }, stdinOption);
      // If backspace fails, filename will be incorrect.
      expect(output).toMatch(/^cat a.txt\r\nAZ\r\n/);
    });
  });

  test('should error on redirect stdin from file', async ({ page }) => {
    const output = await shellLineSimple(page, 'nano < file2');
    expect(output).toMatch('\r\nError opening terminal');
  });

  test('should error on stdin pipe', async ({ page }) => {
    const output = await shellLineSimple(page, 'cat file2 | nano');
    expect(output).toMatch('\r\nError opening terminal');
  });
});
