import { expect } from '@playwright/test';
import { shellLineSimple, test } from '../utils';

test.describe('less command', () => {
  test('should output version', async ({ page }) => {
    const output = await shellLineSimple(page, 'less --version');
    expect(output).toMatch(/^less --version\r\nless \d{3} \(PCRE2 regular expressions\)\r\n/);
  });

  test('should write to file from named file', async ({ page }) => {
    const output = await page.evaluate(async () => {
      const { output, shell } = await globalThis.cockle.shellSetupSimple({ color: true });
      await shell.inputLine('less file2 > out');
      const exitCode = await shell.exitCode();
      output.clear();
      await shell.inputLine('cat out');
      return [exitCode, output.text];
    });
    expect(output[0]).toBe(0);
    expect(output[1]).toMatch('cat out\r\nSome other file\r\nSecond line\r\n');
  });

  test('should write to file from redirected stdin', async ({ page }) => {
    const output = await page.evaluate(async () => {
      const { output, shell } = await globalThis.cockle.shellSetupSimple({ color: true });
      await shell.inputLine('less < file2 > out');
      const exitCode = await shell.exitCode();
      output.clear();
      await shell.inputLine('cat out');
      return [exitCode, output.text];
    });
    expect(output[0]).toBe(0);
    expect(output[1]).toMatch('cat out\r\nSome other file\r\nSecond line\r\n');
  });

  test('should write to file from pipe', async ({ page }) => {
    const output = await page.evaluate(async () => {
      const { output, shell } = await globalThis.cockle.shellSetupSimple({ color: true });
      await shell.inputLine('cat file2 | less > out');
      const exitCode = await shell.exitCode();
      output.clear();
      await shell.inputLine('cat out');
      return [exitCode, output.text];
    });
    expect(output[0]).toBe(0);
    expect(output[1]).toMatch('cat out\r\nSome other file\r\nSecond line\r\n');
  });

  const stdinOptions = ['sab', 'sw'];
  stdinOptions.forEach(stdinOption => {
    test(`should read from named file and quit using ${stdinOption}`, async ({
      page,
      supportsSAB
    }) => {
      test.skip(stdinOption === 'sab' && !supportsSAB, 'SAB not available');
      await page.evaluate(async stdinOption => {
        const { shellSetupSimple, terminalInput } = globalThis.cockle;
        const { shell } = await shellSetupSimple({ color: true, stdinOption });
        const cmd = shell.inputLine('less file2');
        terminalInput(shell, ['q']); // q key to exit.
        await cmd;
      }, stdinOption);
      // If less does not close, test will timeout.
    });

    test(`should read redirected file from stdin and quit using ${stdinOption}`, async ({
      page,
      supportsSAB
    }) => {
      test.skip(stdinOption === 'sab' && !supportsSAB, 'SAB not available');
      await page.evaluate(async stdinOption => {
        const { shellSetupSimple, terminalInput } = globalThis.cockle;
        const { shell } = await shellSetupSimple({ color: true, stdinOption });
        const cmd = shell.inputLine('less < file2');
        terminalInput(shell, ['q']); // q key to exit.
        await cmd;
      }, stdinOption);
      // If less does not close, test will timeout.
    });

    test(`should read from pipe and quit using ${stdinOption}`, async ({ page, supportsSAB }) => {
      test.skip(stdinOption === 'sab' && !supportsSAB, 'SAB not available');
      await page.evaluate(async stdinOption => {
        const { shellSetupSimple, terminalInput } = globalThis.cockle;
        const { shell } = await shellSetupSimple({ color: true, stdinOption });
        const cmd = shell.inputLine('cat file2 | less');
        terminalInput(shell, ['q']); // q key to exit.
        await cmd;
      }, stdinOption);
      // If less does not close, test will timeout.
    });

    test(`should redraw on SIGWINCH using ${stdinOption}`, async ({ page, supportsSAB }) => {
      test.skip(stdinOption === 'sab' && !supportsSAB, 'SAB not available');
      const output = await page.evaluate(async stdinOption => {
        const { delay, shellSetupEmpty, terminalInput } = globalThis.cockle;
        const { shell, output } = await shellSetupEmpty({ color: true, stdinOption });
        await shell.inputLine('seq 50 > lines');
        const cmd = shell.inputLine('less lines');
        await delay(500);
        output.clear();
        // Do not await setSize as it does not resolve until less exits, as the worker is blocked.
        shell.setSize({ rows: 40, columns: 80 });
        await delay(500);
        const redraw0 = output.textAndClear();
        shell.setSize({ rows: 10, columns: 80 });
        await delay(500);
        const redraw1 = output.text;
        await terminalInput(shell, ['q']); // q key to exit.
        await cmd;
        return [redraw0, redraw1];
      }, stdinOption);
      // Initially 24 rows so lines 1 to 23 shown. After each resize less clears the screen and
      // redraws lines 1 to (rows - 1) followed by its prompt.
      const expected = (rows: number) => {
        const lines = Array.from({ length: rows - 1 }, (_, i) => `${i + 1}\r\n`).join('');
        return `\x1b[H\x1b[2J\x1b[H${lines}:\x1b[K`;
      };
      expect(output[0]).toEqual(expected(40));
      expect(output[1]).toEqual(expected(10));
    });
  });
});
