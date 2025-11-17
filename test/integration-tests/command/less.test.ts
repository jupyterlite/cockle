import { expect } from '@playwright/test';
import { shellLineSimple, test } from '../utils';

test.describe('less command', () => {
  test('should output version', async ({ page }) => {
    const output = await shellLineSimple(page, 'less --version');
    expect(output).toMatch(/^less --version\r\nless 668 \(POSIX regular expressions\)\r\n/);
  });

  const stdinOptions = ['sab', 'sw'];
  stdinOptions.forEach(stdinOption => {
    test(`should run interactively and exit using ${stdinOption}`, async ({ page }) => {
      await page.evaluate(async stdinOption => {
        const { shellSetupSimple, terminalInput } = globalThis.cockle;
        const { shell } = await shellSetupSimple({ color: true, stdinOption });
        await Promise.all([
          shell.inputLine('less file2'),
          terminalInput(shell, ['q']) // q key to exit.
        ]);
      }, stdinOption);
      // If less does not close, test will timeout.
    });
  });
});
