import { expect } from '@playwright/test';
import { shellLineSimple, test } from '../utils';

test.describe('vim command', () => {
  test('should output version', async ({ page }) => {
    const output = await shellLineSimple(page, 'vim --version');
    expect(output).toMatch(/^vim --version\r\nVIM - Vi IMproved 9.1/);
  });

  test('should run interactively and exit', async ({ page }) => {
    await page.evaluate(async () => {
      const { shell } = await globalThis.cockle.shellSetupEmpty();
      await Promise.all([
        shell.inputLine('vim'),
        globalThis.cockle.terminalInput(shell, ['\x1b', ':', 'q', '\r'])
      ]);
    });
  });

  test('should create new file', async ({ page }) => {
    const output = await page.evaluate(async () => {
      const { shell, output } = await globalThis.cockle.shellSetupEmpty();
      await Promise.all([
        shell.inputLine('vim'),
        globalThis.cockle.terminalInput(shell, [...'ihi QW\x1b:wq out\r'])
      ]);
      // New file should exist.
      output.clear();
      await shell.inputLine('cat out');
      return output.text;
    });
    expect(output).toMatch(/^cat out\r\nhi QW\r\n/);
  });
});
