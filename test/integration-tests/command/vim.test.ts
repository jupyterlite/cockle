import { expect } from '@playwright/test';
import { shellLineSimple, test } from '../utils';

test.describe('vim command', () => {
  test('should output version', async ({ page }) => {
    const output = await shellLineSimple(page, 'vim --version');
    expect(output).toMatch(/^vim --version\r\nVIM - Vi IMproved 9.1/);
  });

  const stdinOptions = ['sab', 'sw'];
  stdinOptions.forEach(stdinOption => {
    test(`should run interactively and exit using ${stdinOption}`, async ({ page }) => {
      await page.evaluate(async stdinOption => {
        // Use color: true to ensure TERM env var is set.
        const { shellSetupEmpty, terminalInput } = globalThis.cockle;
        const { shell } = await shellSetupEmpty({ color: true, stdinOption });
        await Promise.all([shell.inputLine('vim'), terminalInput(shell, ['\x1b', ':', 'q', '\r'])]);
      });
    });

    test(`should create new file using ${stdinOption}`, async ({ page }) => {
      const output = await page.evaluate(async stdinOption => {
        const { shellSetupEmpty, terminalInput } = globalThis.cockle;
        const { shell, output } = await shellSetupEmpty({ color: true, stdinOption });
        await Promise.all([
          shell.inputLine('vim'),
          terminalInput(shell, [
            'i',
            'h',
            'i',
            ' ',
            'Q',
            'W',
            '\x1b',
            ':',
            'w',
            'q',
            ' ',
            'o',
            'u',
            't',
            '\r'
          ])
        ]);
        // New file should exist.
        output.clear();
        await shell.inputLine('cat out');
        return output.text;
      });
      expect(output).toMatch(/^cat out\r\nhi QW\r\n/);
    });

    test(`should add to existing file using ${stdinOption}`, async ({ page }) => {
      const output = await page.evaluate(async stdinOption => {
        const { keys, shellSetupSimple, terminalInput } = globalThis.cockle;
        const { shell, output } = await shellSetupSimple({ color: true, stdinOption });
        await Promise.all([
          shell.inputLine('vim file2'),
          terminalInput(shell, [keys.down, 'i', 'N', 'e', 'w', '\r', '\x1b', ':', 'w', 'q', '\r'])
        ]);
        output.clear();
        await shell.inputLine('cat file2');
        return output.text;
      });
      expect(output).toMatch(/^cat file2\r\nSome other file\r\nNew\r\nSecond line\r\n/);
    });

    test(`should delete from existing file using ${stdinOption}`, async ({ page }) => {
      const output = await page.evaluate(async stdinOption => {
        const { shellSetupSimple, terminalInput } = globalThis.cockle;
        const { shell, output } = await shellSetupSimple({ color: true, stdinOption });
        await Promise.all([
          shell.inputLine('vim file2'),
          terminalInput(shell, ['d', 'd', '\r', '\x1b', ':', 'w', 'q', '\r'])
        ]);
        output.clear();
        await shell.inputLine('cat file2');
        return output.text;
      });
      expect(output).toMatch(/^cat file2\r\nSecond line\r\n/);
    });

    test(`should support multi-character escape sequences using ${stdinOption}`, async ({
      page
    }) => {
      const output = await page.evaluate(async stdinOption => {
        const { shell, output } = await globalThis.cockle.shellSetupEmpty({
          color: true,
          stdinOption
        });
        const { keys, terminalInput } = globalThis.cockle;
        const { escape, leftArrow, upArrow } = keys;
        await Promise.all([
          shell.inputLine('vim'),
          terminalInput(shell, [
            ...('iabc\rdef' + upArrow + leftArrow + leftArrow + 'XY' + escape + ':wq out\r')
          ])
        ]);
        // New file should exist.
        output.clear();
        await shell.inputLine('cat out');
        return output.text;
      });
      expect(output).toMatch(/^cat out\r\naXYbc\r\ndef\r\n/);
    });
  });
});
