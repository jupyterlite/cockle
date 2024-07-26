import { expect } from '@playwright/test';
import { shellRunSimpleN, test } from './utils';

test.describe('history', () => {
  test('should be stored', async ({ page }) => {
    const output = await shellRunSimpleN(page, ['cat', 'echo', 'ls', 'history']);
    expect(output.at(-1)).toEqual('    0  cat\r\n    1  echo\r\n    2  ls\r\n    3  history\r\n');
  });

  test('should ignore duplicates', async ({ page }) => {
    const output = await shellRunSimpleN(page, ['cat', 'cat', 'history']);
    expect(output.at(-1)).toEqual('    0  cat\r\n    1  history\r\n');
  });

  test('should ignore commands starting with whitespace', async ({ page }) => {
    const output = await shellRunSimpleN(page, [' ls', 'history']);
    expect(output.at(-1)).toEqual('    0  history\r\n');
  });

  test('should limit storage to max size', async ({ page }) => {
    const output = await page.evaluate(async () => {
      const { shell, output } = await globalThis.cockle.shell_setup_empty();
      const { history } = shell;
      history.setMaxSize(5);

      await shell._runCommands('cat');
      await shell._runCommands('echo');
      await shell._runCommands('ls');
      await shell._runCommands('uname');
      await shell._runCommands('uniq');
      output.clear();

      await shell._runCommands('history');
      return output.text;
    });
    expect(output).toEqual(
      '    0  echo\r\n    1  ls\r\n    2  uname\r\n    3  uniq\r\n    4  history\r\n'
    );
  });

  test('should clip history when reduce max size', async ({ page }) => {
    const output = await page.evaluate(async () => {
      const { shell, output } = await globalThis.cockle.shell_setup_empty();
      const { history } = shell;
      history.setMaxSize(5);

      await shell._runCommands('cat');
      await shell._runCommands('echo');
      await shell._runCommands('ls');
      await shell._runCommands('uname');
      await shell._runCommands('uniq');
      output.clear();

      history.setMaxSize(3);

      await shell._runCommands('history');
      return output.text;
    });
    expect(output).toEqual('    0  uname\r\n    1  uniq\r\n    2  history\r\n');
  });

  test('should rerun commands using !index syntax, negative and positive', async ({ page }) => {
    const output = await shellRunSimpleN(page, ['cat', 'echo hello', 'ls', '!-2', '!1']);
    expect(output.at(-2)).toEqual('hello\r\n');
    expect(output.at(-1)).toEqual('hello\r\n');
  });

  test('should handle !index out of bounds', async ({ page }) => {
    const output = await shellRunSimpleN(page, ['ls', '!1']);
    expect(output.at(-1)).toMatch(/!1: event not found/);
  });

  test('should scroll up and down', async ({ page }) => {
    const output = await page.evaluate(async () => {
      const { shell, output } = await globalThis.cockle.shell_setup_empty();
      await shell._runCommands('cat');
      await shell._runCommands('echo hello');
      await shell._runCommands('ls');
      output.clear();

      const upArrow = '\x1B[A';
      const downArrow = '\x1B[B';

      await shell.input(upArrow);
      await shell.input(upArrow);
      const ret = [output.text];
      output.clear();

      await shell.input(upArrow);
      ret.push(output.text);
      output.clear();

      await shell.input(upArrow);
      ret.push(output.text);
      output.clear();

      await shell.input(downArrow);
      ret.push(output.text);
      output.clear();

      await shell.input(downArrow);
      ret.push(output.text);
      output.clear();

      await shell.input(downArrow);
      ret.push(output.text);
      return ret;
    });
    expect(output[0]).toMatch(/echo hello$/);
    expect(output[1]).toMatch(/cat$/);
    expect(output[2]).toMatch(/cat$/);
    expect(output[3]).toMatch(/echo hello$/);
    expect(output[4]).toMatch(/ls$/);
    expect(output[5]).toMatch(/ $/);
  });
});
