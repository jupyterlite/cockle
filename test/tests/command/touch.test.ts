import { expect } from '@playwright/test';
import { test } from '../utils';

test.describe('touch command', () => {
  test('should create file', async ({ page }) => {
    const output = await page.evaluate(async () => {
      const { shell, output } = await globalThis.cockle.shellSetupEmpty();
      await shell.inputLine('ls abc');
      const ret = [output.text];

      await shell.inputLine('touch abc');
      output.clear();
      await shell.inputLine('env | grep ^?=');
      ret.push(output.textAndClear());

      await shell.inputLine('ls abc');
      ret.push(output.textAndClear());

      await shell.inputLine('touch abc');
      output.clear();
      await shell.inputLine('env | grep ^?=');
      ret.push(output.textAndClear());

      await shell.inputLine('ls abc');
      ret.push(output.textAndClear());
      return ret;
    });
    expect(output[0]).toMatch("ls: cannot access 'abc': No such file or directory");
    // Note exitCode is 1 when it should be 0, but we are expecting 1 due to bad file descriptor
    // workaround. When that is fully fixed, change expected exitCode to be 0.
    expect(output[1]).toMatch(/\r\n\?=1\r\n/);
    expect(output[2]).toMatch(/^ls abc\r\nabc\r\n/);
    expect(output[3]).toMatch(/\r\n\?=1\r\n/);
    expect(output[4]).toMatch(/^ls abc\r\nabc\r\n/);
  });
});
