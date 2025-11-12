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
        await Promise.all([shell.inputLine('nano'), terminalInput(shell, [exit])]);
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
        await Promise.all([
          shell.inputLine('nano'),
          terminalInput(shell, [
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
          ])
        ]);
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
        await Promise.all([
          shell.inputLine('nano file2'),
          terminalInput(shell, [downArrow, 'N', 'e', 'w', enter, writeFile, enter, exit])
        ]);
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
        await Promise.all([
          shell.inputLine('nano file2'),
          // Delete first line of file, leaving just the second line.
          terminalInput(shell, [deleteLine, writeFile, enter, exit])
        ]);
        output.clear();
        await shell.inputLine('cat file2');
        return output.text;
      }, stdinOption);
      expect(output).toMatch(/^cat file2\r\nSecond line\r\n/);
    });
  });
});
