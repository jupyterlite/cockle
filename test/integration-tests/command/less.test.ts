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
    test(`should read from named file and quit using ${stdinOption}`, async ({ page }) => {
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
      page
    }) => {
      await page.evaluate(async stdinOption => {
        const { shellSetupSimple, terminalInput } = globalThis.cockle;
        const { shell } = await shellSetupSimple({ color: true, stdinOption });
        const cmd = shell.inputLine('less < file2');
        terminalInput(shell, ['q']); // q key to exit.
        await cmd;
      }, stdinOption);
      // If less does not close, test will timeout.
    });

    test(`should read from pipe and quit using ${stdinOption}`, async ({ page }) => {
      await page.evaluate(async stdinOption => {
        const { shellSetupSimple, terminalInput } = globalThis.cockle;
        const { shell } = await shellSetupSimple({ color: true, stdinOption });
        const cmd = shell.inputLine('cat file2 | less');
        terminalInput(shell, ['q']); // q key to exit.
        await cmd;
      }, stdinOption);
      // If less does not close, test will timeout.
    });
  });
});
