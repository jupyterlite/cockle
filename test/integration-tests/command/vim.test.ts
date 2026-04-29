import { expect } from '@playwright/test';
import { shellLineSimple, test } from '../utils';

test.describe('vim command', () => {
  test('should output version', async ({ page }) => {
    const output = await shellLineSimple(page, 'vim --version');
    expect(output).toMatch(/^vim --version\r\nVIM - Vi IMproved 9.2/);
  });

  const stdinOptions = ['sab', 'sw'];
  stdinOptions.forEach(stdinOption => {
    test(`should run interactively and exit using ${stdinOption}`, async ({ page }) => {
      await page.evaluate(async stdinOption => {
        // Use color: true to ensure TERM env var is set.
        const { shellSetupEmpty, terminalInput } = globalThis.cockle;
        const { shell } = await shellSetupEmpty({ color: true, stdinOption });
        const cmd = shell.inputLine('vim');
        await terminalInput(shell, ['\x1b', ':', 'q', '\r']);
        await cmd;
      }, stdinOption);
    });

    test(`should create new file using ${stdinOption}`, async ({ page }) => {
      const output = await page.evaluate(async stdinOption => {
        const { shellSetupEmpty, terminalInput } = globalThis.cockle;
        const { shell, output } = await shellSetupEmpty({ color: true, stdinOption });
        const cmd = shell.inputLine('vim');
        await terminalInput(shell, [
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
        ]);
        await cmd;
        // New file should exist.
        output.clear();
        await shell.inputLine('cat out');
        return output.text;
      }, stdinOption);
      expect(output).toMatch(/^cat out\r\nhi QW\r\n/);
    });

    test(`should add to existing file using ${stdinOption}`, async ({ page }) => {
      const output = await page.evaluate(async stdinOption => {
        const { keys, shellSetupSimple, terminalInput } = globalThis.cockle;
        const { shell, output } = await shellSetupSimple({ color: true, stdinOption });
        const cmd = shell.inputLine('vim file2');
        await terminalInput(shell, [
          keys.down,
          'i',
          'N',
          'e',
          'w',
          '\r',
          '\x1b',
          ':',
          'w',
          'q',
          '\r'
        ]);
        await cmd;
        output.clear();
        await shell.inputLine('cat file2');
        return output.text;
      }, stdinOption);
      expect(output).toMatch(/^cat file2\r\nSome other file\r\nNew\r\nSecond line\r\n/);
    });

    test(`should delete from existing file using ${stdinOption}`, async ({ page }) => {
      const output = await page.evaluate(async stdinOption => {
        const { shellSetupSimple, terminalInput } = globalThis.cockle;
        const { shell, output } = await shellSetupSimple({ color: true, stdinOption });
        const cmd = shell.inputLine('vim file2');
        await terminalInput(shell, ['d', 'd', '\r', '\x1b', ':', 'w', 'q', '\r']);
        await cmd;
        output.clear();
        await shell.inputLine('cat file2');
        return output.text;
      }, stdinOption);
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
        const cmd = shell.inputLine('vim');
        await terminalInput(shell, [
          ...('iabc\rdef' + upArrow + leftArrow + leftArrow + 'XY' + escape + ':wq out\r')
        ]);
        await cmd;
        // New file should exist.
        output.clear();
        await shell.inputLine('cat out');
        return output.text;
      }, stdinOption);
      expect(output).toMatch(/^cat out\r\naXYbc\r\ndef\r\n/);
    });
  });

  test('should error on redirect stdin from file', async ({ page }) => {
    const output = await shellLineSimple(page, 'vim < file2');
    expect(output).toMatch('\r\nVim: Warning: Input is not from a terminal\r\n');
  });

  test('should error on stdin pipe', async ({ page }) => {
    const output = await shellLineSimple(page, 'cat file2 | vim');
    expect(output).toMatch('\r\nVim: Warning: Input is not from a terminal\r\n');
  });
});
