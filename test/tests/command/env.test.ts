import { expect } from '@playwright/test';
import { test } from '../utils';

test.describe('env command', () => {
  test('should write to stdout', async ({ page }) => {
    const output = await page.evaluate(async () => {
      const { shell, output } = await globalThis.cockle.shell_setup_simple();
      const { environment } = shell;
      const MYENV0 = environment.get('MYENV');
      await shell._runCommands('env MYENV=23');
      const MYENV1 = environment.get('MYENV');
      return { MYENV0, MYENV1, text: output.text };
    });
    expect(output.MYENV0).toBeUndefined();
    expect(output.MYENV1).toBeUndefined();
    expect(output.text.trim().split('\r\n').at(-1)).toEqual('MYENV=23');
  });

  test('should support quotes', async ({ page }) => {
    const output = await page.evaluate(async () => {
      const { shell, output } = await globalThis.cockle.shell_setup_simple();
      const { environment } = shell;
      await shell._runCommands('env MYENV="ls -alF"');
      const MYENV = environment.get('MYENV');
      return { MYENV, text: output.text };
    });
    expect(output.MYENV).toBeUndefined();
    expect(output.text.trim().split('\r\n').at(-1)).toEqual('MYENV=ls -alF');
  });
});
