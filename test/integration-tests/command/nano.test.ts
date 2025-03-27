import { expect } from '@playwright/test';
import { shellLineSimple, test } from '../utils';

test.describe('nano command', () => {
  test('should output version', async ({ page }) => {
    const output = await shellLineSimple(page, 'nano --version');
    expect(output).toMatch(/^nano --version\r\n GNU nano, version 8.2\r\n/);
  });

  test('should open and close', async ({ page }) => {
    await page.evaluate(async () => {
      const { shell } = await globalThis.cockle.shellSetupEmpty({ color: true });
      const { terminalInput } = globalThis.cockle;
      const exit = '\x18'; // Ctrl-X
      await Promise.all([shell.inputLine('nano'), terminalInput(shell, [exit])]);
    });
    // If nano does not close, test will timeout.
  });

  test('should create new file', async ({ page }) => {
    const output = await page.evaluate(async () => {
      const { shell, output } = await globalThis.cockle.shellSetupEmpty({ color: true });
      const { keys, terminalInput } = globalThis.cockle;
      const { enter } = keys;
      const exit = '\x18'; // Ctrl-X
      const writeFile = '\x0f'; // Ctrl-O
      await Promise.all([
        shell.inputLine('nano'),
        terminalInput(shell, [...('abc\ndef' + writeFile + 'out.txt' + enter + exit)])
      ]);
      // New file should exist.
      output.clear();
      await shell.inputLine('cat out.txt');
      return output.text;
    });
    expect(output).toMatch(/^cat out.txt\r\nabc\r\ndef\r\n/);
  });
});
