import { expect } from '@playwright/test';
import { shellRunSimple, test } from '../utils';

test.describe('grep command', () => {
  test('should write to stdout', async ({ page }) => {
    expect(await shellRunSimple(page, 'grep cond file2')).toEqual('Second line\r\n');
  });

  test('should support ^ and $', async ({ page }) => {
    const output = await page.evaluate(async () => {
      const { shell, output, FS } = await globalThis.cockle.shell_setup_simple();
      FS.writeFile('file3', ' hello\nhello ');
      await shell._runCommands('grep hello file3');
      const output0 = output.text;
      output.clear();

      await shell._runCommands('grep ^hello file3');
      const output1 = output.text;
      output.clear();

      await shell._runCommands('grep hello$ file3');
      return [output0, output1, output.text];
    });
    const line0 = ' hello';
    const line1 = 'hello ';
    expect(output[0]).toEqual(line0 + '\r\n' + line1 + '\r\n');
    expect(output[1]).toEqual(line1 + '\r\n');
    expect(output[2]).toEqual(line0 + '\r\n');
  });
});
