import { expect } from '@playwright/test';
import { test } from '../utils';

test.describe('js-test', () => {
  test('should register', async ({ page }) => {
    const output = await page.evaluate(async () => {
      const { shell, output } = await globalThis.cockle.shellSetupEmpty();
      await shell.inputLine('cockle-config command js-test');
      return output.text;
    });
    expect(output).toMatch('│ js-test │ js-test │');
  });

  test('should write to stdout', async ({ page }) => {
    const output = await page.evaluate(async () => {
      const { shell, output } = await globalThis.cockle.shellSetupEmpty();
      await shell.inputLine('js-test stdout');
      return output.text;
    });
    expect(output).toMatch('\r\nOutput line 1\r\nOutput line 2\r\n');
  });

  test('should write to file', async ({ page }) => {
    const output = await page.evaluate(async () => {
      const { shell, output } = await globalThis.cockle.shellSetupEmpty();
      await shell.inputLine('js-test stdout > out.txt');
      const out0 = output.textAndClear();
      await shell.inputLine('cat out.txt');
      return [out0, output.text];
    });
    expect(output[0]).not.toMatch('Output line');
    expect(output[1]).toMatch('cat out.txt\r\nOutput line 1\r\nOutput line 2\r\n');
  });

  test('should write to stderr', async ({ page }) => {
    const output = await page.evaluate(async () => {
      const { shell, output } = await globalThis.cockle.shellSetupEmpty();
      await shell.inputLine('js-test stderr > out.txt');
      return output.text;
    });
    expect(output).toMatch('Error message\r\n');
  });

  test('should write to named file', async ({ page }) => {
    const output = await page.evaluate(async () => {
      const { shell, output } = await globalThis.cockle.shellSetupEmpty();
      await shell.inputLine('js-test writefile');
      output.clear();
      await shell.inputLine('cat writefile.txt');
      return output.text;
    });
    expect(output).toMatch('\r\nFile written by js-test\r\n');
  });

  test('should read from named file', async ({ page }) => {
    const output = await page.evaluate(async () => {
      const { shell, output } = await globalThis.cockle.shellSetupEmpty();
      await shell.inputLine('js-test readfile'); // Fails, no such file.
      const ret0 = output.textAndClear();
      await shell.inputLine('echo abcdefghij0123456789 > readfile.txt');
      output.clear();
      await shell.inputLine('js-test readfile'); // Succeeds and echoes to stdout.
      return [ret0, output.text];
    });
    expect(output[0]).toMatch('\r\nUnable to open file readfile.txt for reading\r\n');
    expect(output[1]).toMatch('\r\nabcdefghij0123456789\r\n');
  });

  test('should return exit code', async ({ page }) => {
    const output = await page.evaluate(async () => {
      const { shell, output } = await globalThis.cockle.shellSetupEmpty();
      await shell.inputLine('js-test');
      output.clear();
      await shell.inputLine('env | grep ?');
      const ret0 = output.textAndClear();
      await shell.inputLine('js-test exitCode');
      output.clear();
      await shell.inputLine('env | grep ?');
      const ret1 = output.textAndClear();
      return [ret0, ret1];
    });
    expect(output[0]).toMatch('\r\n?=0\r\n');
    expect(output[1]).toMatch('\r\n?=1\r\n');
  });

  test('should set new environment variable', async ({ page }) => {
    const output = await page.evaluate(async () => {
      const { shell, output } = await globalThis.cockle.shellSetupEmpty();
      await shell.inputLine('js-test environment');
      output.clear();
      await shell.inputLine('env | grep TEST_JS_VAR');
      return output.text;
    });
    expect(output).toMatch('\r\nTEST_JS_VAR=123\r\n');
  });

  test('should change environment variable', async ({ page }) => {
    const output = await page.evaluate(async () => {
      const { shell, output } = await globalThis.cockle.shellSetupEmpty();
      await shell.inputLine('export TEST_JS_VAR=abc');
      output.clear();
      await shell.inputLine('env | grep TEST_JS_VAR');
      const ret0 = output.textAndClear();
      await shell.inputLine('js-test environment');
      output.clear();
      await shell.inputLine('env | grep TEST_JS_VAR');
      return [ret0, output.text];
    });
    expect(output[0]).toMatch('\r\nTEST_JS_VAR=abc\r\n');
    expect(output[1]).toMatch('\r\nTEST_JS_VAR=123\r\n');
  });

  test('should delete environment variable', async ({ page }) => {
    const output = await page.evaluate(async () => {
      const { shell, output } = await globalThis.cockle.shellSetupEmpty();
      await shell.inputLine('export TEST_JS_VAR2=9876');
      output.clear();
      await shell.inputLine('env | grep TEST_JS_VAR2');
      const ret0 = output.textAndClear();
      await shell.inputLine('js-test environment');
      output.clear();
      await shell.inputLine('env | grep TEST_JS_VAR2');
      await shell.inputLine('env | grep ?'); // Check error code
      return [ret0, output.text];
    });
    expect(output[0]).toMatch('\r\nTEST_JS_VAR2=9876\r\n');
    expect(output[1]).toMatch('\r\n?=1\r\n');
  });

  test('should be passed command name', async ({ page }) => {
    const output = await page.evaluate(async () => {
      const { shell, output } = await globalThis.cockle.shellSetupEmpty();
      await shell.inputLine('js-test name');
      return output.text;
    });
    expect(output).toMatch('\r\njs-test\r\n');
  });

  test('should read from pipe', async ({ page }) => {
    const output = await page.evaluate(async () => {
      const { shell, output } = await globalThis.cockle.shellSetupSimple();
      await shell.inputLine('cat file2 | js-test stdin');
      return output.text;
    });
    expect(output).toMatch(/^cat file2 | js-test stdin\r\nSOME OTHER FILE\r\nSECOND LINE\r\n/);
  });

  test('should read from file', async ({ page }) => {
    const output = await page.evaluate(async () => {
      const { shell, output } = await globalThis.cockle.shellSetupSimple();
      await shell.inputLine('js-test stdin < file2');
      return output.text;
    });
    expect(output).toMatch(/^js-test stdin < file2\r\nSOME OTHER FILE\r\nSECOND LINE\r\n/);
  });

  const stdinOptions = ['sab', 'sw'];
  stdinOptions.forEach(stdinOption => {
    test(`should read from stdin via ${stdinOption}`, async ({ page }) => {
      const output = await page.evaluate(async stdinOption => {
        const { keys, shellSetupEmpty } = globalThis.cockle;
        const { shell, output } = await shellSetupEmpty({ stdinOption });
        await Promise.all([
          shell.inputLine('js-test stdin'),
          globalThis.cockle.terminalInput(shell, ['a', 'B', ' ', 'c', keys.EOT])
        ]);
        return output.text;
      });
      expect(output).toMatch(/^js-test stdin\r\naABB {2}cC\r\n/);
    });
  });
});
