import { expect } from '@playwright/test';
import { test } from '../utils';

test.describe('wasm-test', () => {
  test('should write to stdout', async ({ page }) => {
    const output = await page.evaluate(async () => {
      const { shell, output } = await globalThis.cockle.shellSetupEmpty();
      await shell.inputLine('wasm-test stdout');
      return output.text;
    });
    expect(output).toMatch('\r\nOutput line 1\r\nOutput line 2\r\n');
  });

  test('should write to file', async ({ page }) => {
    const output = await page.evaluate(async () => {
      const { shell, output } = await globalThis.cockle.shellSetupEmpty();
      await shell.inputLine('wasm-test stdout > out.txt');
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
      await shell.inputLine('wasm-test stderr > out.txt');
      return output.text;
    });
    expect(output).toMatch('Error message\r\n');
  });

  test('should return exit code', async ({ page }) => {
    const output = await page.evaluate(async () => {
      const { shell, output } = await globalThis.cockle.shellSetupEmpty();
      await shell.inputLine('wasm-test');
      output.clear();
      await shell.inputLine('env | grep ?');
      const ret0 = output.textAndClear();
      await shell.inputLine('wasm-test exitCode');
      output.clear();
      await shell.inputLine('env | grep ?');
      const ret1 = output.textAndClear();
      return [ret0, ret1];
    });
    expect(output[0]).toMatch('\r\n?=0\r\n');
    expect(output[1]).toMatch('\r\n?=1\r\n');
  });

  test('should be passed command name', async ({ page }) => {
    const output = await page.evaluate(async () => {
      const { shell, output } = await globalThis.cockle.shellSetupEmpty();
      await shell.inputLine('wasm-test name');
      return output.text;
    });
    expect(output).toMatch('\r\nwasm-test\r\n');
  });

  test('should read from pipe', async ({ page }) => {
    const output = await page.evaluate(async () => {
      const { shell, output } = await globalThis.cockle.shellSetupEmpty();
      await shell.inputLine('cat file2 | wasm-test stdin');
      return output.text;
    });
    expect(output).toMatch(/^cat file2 | wasm-test stdin\r\nSOME OTHER FILE\r\nSECOND LINE\r\n/);
  });

  test('should read from file', async ({ page }) => {
    const output = await page.evaluate(async () => {
      const { shell, output } = await globalThis.cockle.shellSetupSimple();
      await shell.inputLine('wasm-test stdin < file2');
      return output.text;
    });
    expect(output).toMatch(/^wasm-test stdin < file2\r\nSOME OTHER FILE\r\nSECOND LINE\r\n/);
  });

  const stdinOptions = ['sab', 'sw'];
  stdinOptions.forEach(stdinOption => {
    test(`should read from stdin via ${stdinOption}`, async ({ page }) => {
      const output = await page.evaluate(async stdinOption => {
        const { keys, shellSetupEmpty } = globalThis.cockle;
        const { shell, output } = await shellSetupEmpty({ stdinOption });
        await Promise.all([
          shell.inputLine('wasm-test stdin'),
          globalThis.cockle.terminalInput(shell, ['a', 'B', ' ', 'c', keys.EOT])
        ]);
        return output.text;
      });
      expect(output).toMatch(/^wasm-test stdin\r\naABB {2}cC\r\n/);
    });
  });
});
