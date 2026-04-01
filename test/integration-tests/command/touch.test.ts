import { expect } from '@playwright/test';
import { test } from '../utils';

test.describe('touch command', () => {
  test('should create file', async ({ page }) => {
    const output = await page.evaluate(async () => {
      const { shell, output } = await globalThis.cockle.shellSetupEmpty();
      await shell.inputLine('ls abc');
      const ret = [await shell.exitCode(), output.textAndClear()];

      await shell.inputLine('touch abc');
      ret.push(await shell.exitCode(), output.textAndClear());

      await shell.inputLine('ls abc');
      ret.push(await shell.exitCode(), output.textAndClear());

      await shell.inputLine('touch abc');
      ret.push(await shell.exitCode(), output.textAndClear());

      await shell.inputLine('ls abc');
      ret.push(await shell.exitCode(), output.textAndClear());
      return ret;
    });

    // Initial ls fails.
    expect(output[0]).toBe(2);
    expect(output[1]).toMatch("ls: cannot access 'abc': No such file or directory");

    // Initial touch creates file.
    expect(output[2]).toBe(0);
    expect(output[3]).toMatch(/^touch abc\r\n/);

    // ls succeeds.
    expect(output[4]).toBe(0);
    expect(output[5]).toMatch(/^ls abc\r\nabc\r\n/);

    // Second touch succeeds.
    expect(output[6]).toBe(0);
    expect(output[7]).toMatch(/^touch abc\r\n/);

    // Second ls succeeds.
    expect(output[8]).toBe(0);
    expect(output[9]).toMatch(/^ls abc\r\nabc\r\n/);
  });

  test('should fail if parent directory does not exist', async ({ page }) => {
    const output = await page.evaluate(async () => {
      const { shell, output } = await globalThis.cockle.shellSetupEmpty();
      await shell.inputLine('touch /doesnotexist/filename');
      return [await shell.exitCode(), output.textAndClear()];
    });
    expect(output[0]).toBe(1);
    expect(output[1]).toMatch(
      "\r\ntouch: cannot touch '/doesnotexist/filename': No such file or directory\r\n"
    );
  });

  test('should set specific time', async ({ page }) => {
    const output = await page.evaluate(async () => {
      const { shell, output } = await globalThis.cockle.shellSetupSimple();
      await shell.inputLine('touch -d 2020-12-30 dirA file2');
      const ret = [await shell.exitCode(), output.textAndClear()];

      await shell.inputLine('ls --time-style="+%Y-%b-%d" -l');
      ret.push(await shell.exitCode(), output.textAndClear());
      return ret;
    });
    expect(output[0]).toBe(0);

    expect(output[2]).toBe(0);
    expect(output[3]).toMatch('2020-Dec-30 dirA\r\n');
    expect(output[3]).not.toMatch('2020-Dec-30 file1\r\n');
    expect(output[3]).toMatch('2020-Dec-30 file2\r\n');
  });

  test('should not create new files using -c flag', async ({ page }) => {
    const output = await page.evaluate(async () => {
      const { shell, output } = await globalThis.cockle.shellSetupSimple();
      await shell.inputLine('touch -d 2020-12-30 -c file2 file3');
      const ret = [await shell.exitCode(), output.textAndClear()];

      await shell.inputLine('ls --time-style="+%Y-%b-%d" -l');
      ret.push(await shell.exitCode(), output.textAndClear());

      await shell.inputLine('touch -d 2020-11-29 file2 file3');
      ret.push(await shell.exitCode(), output.textAndClear());

      await shell.inputLine('ls --time-style="+%Y-%b-%d" -l');
      ret.push(await shell.exitCode(), output.textAndClear());
      return ret;
    });

    expect(output[0]).toBe(0);

    // Only file2 timestamp updated, file3 not created.
    expect(output[2]).toBe(0);
    expect(output[3]).not.toMatch('2020-Dec-30 dirA\r\n');
    expect(output[3]).not.toMatch('2020-Dec-30 file1\r\n');
    expect(output[3]).toMatch('2020-Dec-30 file2\r\n');
    expect(output[3]).not.toMatch('file3\r\n');

    expect(output[4]).toBe(0);

    // file3 created now, both file2 and file3 timestamps updated.
    expect(output[6]).toBe(0);
    expect(output[7]).toMatch('2020-Nov-29 file2\r\n');
    expect(output[7]).toMatch('2020-Nov-29 file3\r\n');
  });
});
