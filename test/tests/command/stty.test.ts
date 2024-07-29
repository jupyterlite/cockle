import { expect } from '@playwright/test';
import { test } from '../utils';

test.describe('stty command', () => {
  test('should return default size', async ({ page }) => {
    const output = await page.evaluate(async () => {
      const { shell, output } = await globalThis.cockle.shell_setup_empty();
      await shell._runCommands('stty size');
      const output0 = output.text;
      output.clear();

      await shell.setSize(10, 43);
      await shell._runCommands('stty size');
      return [output0, output.text];
    });
    expect(output[0]).toEqual('24 80\r\n');
    expect(output[1]).toEqual('10 43\r\n');
  });
});
