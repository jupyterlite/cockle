import { expect } from '@playwright/test';
import { describeCoiAndNonCoi, shellLineSimple, test } from '../utils';

describeCoiAndNonCoi('vim command', () => {
  test('should output version', async ({ page }) => {
    const output = await shellLineSimple(page, 'vim --version');
    expect(output).toMatch(/^vim --version\r\nVIM - Vi IMproved 9.2/);
  });

  const stdinOptions = ['sab', 'sw'];
  stdinOptions.forEach(stdinOption => {
    test(`should run interactively and exit using ${stdinOption}`, async ({
      page,
      supportsSAB
    }) => {
      test.skip(stdinOption === 'sab' && !supportsSAB, 'SAB not available');
      await page.evaluate(async stdinOption => {
        // Use color: true to ensure TERM env var is set.
        const { shellSetupEmpty, terminalInput } = globalThis.cockle;
        const { shell } = await shellSetupEmpty({ color: true, stdinOption });
        const cmd = shell.inputLine('vim');
        await terminalInput(shell, ['\x1b', ':', 'q', '\r']);
        await cmd;
      }, stdinOption);
    });

    test(`should create new file using ${stdinOption}`, async ({ page, supportsSAB }) => {
      test.skip(stdinOption === 'sab' && !supportsSAB, 'SAB not available');
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

    test(`should add to existing file using ${stdinOption}`, async ({ page, supportsSAB }) => {
      test.skip(stdinOption === 'sab' && !supportsSAB, 'SAB not available');
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

    test(`should delete from existing file using ${stdinOption}`, async ({ page, supportsSAB }) => {
      test.skip(stdinOption === 'sab' && !supportsSAB, 'SAB not available');
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
      page,
      supportsSAB
    }) => {
      test.skip(stdinOption === 'sab' && !supportsSAB, 'SAB not available');
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

    test(`should support backspace when editing using ${stdinOption}`, async ({
      page,
      supportsSAB
    }) => {
      test.skip(stdinOption === 'sab' && !supportsSAB, 'SAB not available');
      const output = await page.evaluate(async stdinOption => {
        const { shell, output } = await globalThis.cockle.shellSetupSimple({
          color: true,
          stdinOption
        });
        const { keys, terminalInput } = globalThis.cockle;
        const { backspace, delete_, escape } = keys;
        // Wait for vim to display the file before typing. Input typed before vim has changed the
        // terminal mode is line edited, so backspace would erase the previous character.
        const ready = output.contains('"file1"');
        const cmd = shell.inputLine('vim file1');
        await ready;
        await terminalInput(shell, [
          ...('$' + backspace + 'iz' + escape + backspace + backspace + delete_ + escape + ':wq\r')
        ]);
        await cmd;
        output.clear();
        await shell.inputLine('cat file1');
        return output.text;
      }, stdinOption);
      expect(output).toMatch(/^cat file1\r\nContents of the izle\r\n/);
    });

    test(`should support backspace when saving using ${stdinOption}`, async ({
      page,
      supportsSAB
    }) => {
      test.skip(stdinOption === 'sab' && !supportsSAB, 'SAB not available');
      const output = await page.evaluate(async stdinOption => {
        const { shell, output } = await globalThis.cockle.shellSetupSimple({
          color: true,
          stdinOption
        });
        const { keys, terminalInput } = globalThis.cockle;
        const { backspace, escape } = keys;
        const cmd = shell.inputLine('vim file1');
        await terminalInput(shell, [...('iz' + escape + ':x' + backspace + 'wq\r')]);
        await cmd;
        output.clear();
        await shell.inputLine('cat file1');
        return output.text;
      }, stdinOption);
      expect(output).toMatch(/^cat file1\r\nzContents of the file\r\n/);
    });

    test(`should redraw on SIGWINCH using ${stdinOption}`, async ({ page, supportsSAB }) => {
      test.skip(stdinOption === 'sab' && !supportsSAB, 'SAB not available');
      const output = await page.evaluate(async stdinOption => {
        const { delay, shellSetupEmpty, terminalInput } = globalThis.cockle;
        const { shell, output } = await shellSetupEmpty({ color: true, stdinOption });
        await shell.inputLine('seq 50 > lines');
        const cmd = shell.inputLine('vim lines');
        await delay(500);
        output.clear();
        // Do not await setSize as it does not resolve until vim exits, as the worker is blocked.
        shell.setSize({ rows: 40, columns: 80 });
        await delay(500);
        const redraw0 = output.textAndClear();
        shell.setSize({ rows: 10, columns: 80 });
        await delay(500);
        const redraw1 = output.text;
        await terminalInput(shell, ['\x1b', ':', 'q', '\r']);
        await cmd;
        return [redraw0, redraw1];
      }, stdinOption);
      // Initially 24 rows. After each resize vim clears the screen and redraws lines 1 to
      // (rows - 1) followed by the ruler on the last row.
      const expected = (rows: number) => {
        const lines = Array.from({ length: rows - 1 }, (_, i) => `${i + 1}`).join('\r\n');
        return (
          '\x1b[27m\x1b[23m\x1b[29m\x1b[m\x1b[H\x1b[2J\x1b[?25l\x1b[1;1H' +
          lines +
          `\x1b[${rows};63H1,1\x1b[11CTop\x1b[1;1H\x1b[?25h`
        );
      };
      expect(output[0]).toEqual(expected(40));
      expect(output[1]).toEqual(expected(10));
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
