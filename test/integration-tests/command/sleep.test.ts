import { expect } from '@playwright/test';
import { shellLineSimple, test } from '../utils';

test.describe('sleep command', () => {
  test('should write to stdout', async ({ page }) => {
    expect(await shellLineSimple(page, 'sleep --version')).toMatch('\r\nsleep (GNU coreutils) ');
  });

  test('should error if no arguments', async ({ page }) => {
    const output = await page.evaluate(async () => {
      const { shell, output } = await globalThis.cockle.shellSetupSimple();
      await shell.inputLine('sleep');
      return [output.text, await shell.exitCode()];
    });
    expect(output[0]).toMatch('\r\nsleep: missing operand\r\n');
    expect(output[1]).toBe(1);
  });

  [0, 0.1, 0.2, 0.3].forEach(sleep_s => {
    test(`should sleep for ${sleep_s} s`, async ({ page }) => {
      const output = await page.evaluate(async sleep_s => {
        const { shell } = await globalThis.cockle.shellSetupSimple();
        const start = Date.now();
        await shell.inputLine(`sleep ${sleep_s}`);
        const duration_ms = Date.now() - start;
        return [await shell.exitCode(), duration_ms];
      }, sleep_s);
      expect(output[0]).toBe(0);
      expect(output[1] / 1000).toBeGreaterThanOrEqual(sleep_s);
      expect(output[1] / 1000).toBeLessThan(sleep_s + 0.1);
    });
  });
});
