import { expect } from '@playwright/test';
import { shellLineSimple, test } from '../utils';

test.describe('vim command', () => {
  test('should output version', async ({ page }) => {
    const output = await shellLineSimple(page, 'vim --version');
    expect(output).toMatch(/^vim --version\r\nVIM - Vi IMproved 9.1/);
  });

  test('should run interactively and exit', async ({ page }) => {
    await page.evaluate(async () => {
      // Use color: true to ensure TERM env var is set.
      const { shell } = await globalThis.cockle.shellSetupEmpty({ color: true });
      const { terminalInput } = globalThis.cockle;
      await Promise.all([shell.inputLine('vim'), terminalInput(shell, ['\x1b', ':', 'q', '\r'])]);
    });
  });

  test('should create new file', async ({ page }) => {
    const output = await page.evaluate(async () => {
      const { shell, output } = await globalThis.cockle.shellSetupEmpty({ color: true });
      const { terminalInput } = globalThis.cockle;
      await Promise.all([shell.inputLine('vim'), terminalInput(shell, [...'ihi QW\x1b:wq out\r'])]);
      // New file should exist.
      output.clear();
      await shell.inputLine('cat out');
      return output.text;
    });
    expect(output).toMatch(/^cat out\r\nhi QW\r\n/);
  });

  test('should support multi-character escape sequences', async ({ page }) => {
    const output = await page.evaluate(async () => {
      const { shell, output } = await globalThis.cockle.shellSetupEmpty({ color: true });
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
