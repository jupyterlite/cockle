import { expect } from '@playwright/test';
import { test } from '../utils';

test.describe('wasm-test', () => {
  test('should register', async ({ page }) => {
    const output = await page.evaluate(async () => {
      const { shell, output } = await globalThis.cockle.shellSetupEmpty();
      await shell.inputLine('cockle-config command wasm-test');
      return output.text;
    });
    expect(output).toMatch('│ wasm-test │ wasm-test │');
  });

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

  test('should write to named file', async ({ page }) => {
    const output = await page.evaluate(async () => {
      const { shell, output } = await globalThis.cockle.shellSetupEmpty();
      await shell.inputLine('wasm-test writefile');
      output.clear();
      await shell.inputLine('cat writefile.txt');
      return output.text;
    });
    expect(output).toMatch('\r\nFile written by wasm-test\r\n');
  });

  test('should read from named file', async ({ page }) => {
    const output = await page.evaluate(async () => {
      const { shell, output } = await globalThis.cockle.shellSetupEmpty();
      await shell.inputLine('wasm-test readfile'); // Fails, no such file.
      const ret0 = output.textAndClear();
      await shell.inputLine('echo abcdefghij0123456789 > readfile.txt');
      output.clear();
      await shell.inputLine('wasm-test readfile'); // Succeeds and echoes to stdout.
      return [ret0, output.text];
    });
    expect(output[0]).toMatch('\r\nUnable to open file readfile.txt for reading\r\n');
    expect(output[1]).toMatch('\r\nabcdefghij0123456789\r\n');
  });

  test('should return exit code', async ({ page }) => {
    const exitCodes = await page.evaluate(async () => {
      const { shell } = await globalThis.cockle.shellSetupEmpty();
      await shell.inputLine('wasm-test');
      const exitCode0 = await shell.exitCode();
      await shell.inputLine('wasm-test exitCode');
      const exitCode1 = await shell.exitCode();
      return [exitCode0, exitCode1];
    });
    expect(exitCodes).toEqual([0, 1]);
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
      }, stdinOption);
      expect(output).toMatch(/^wasm-test stdin\r\naABB {2}cC\r\n/);
    });
  });

  test('should write color to stdout', async ({ page }) => {
    const output = await page.evaluate(async () => {
      const { shell, output } = await globalThis.cockle.shellSetupSimple();
      await shell.inputLine('wasm-test color');
      return output.text;
    });
    const lines = output.split('\r\n');
    // eslint-disable-next-line no-control-regex
    expect(lines[1]).toMatch(/^\x1b\[38;2;255;128;255mA\x1b\[1;0m/);
  });

  test('should not write color to file', async ({ page }) => {
    const output = await page.evaluate(async () => {
      const { shell, output } = await globalThis.cockle.shellSetupSimple();
      await shell.inputLine('wasm-test color > out');
      output.clear();
      await shell.inputLine('cat out');
      return output.text;
    });
    const lines = output.split('\r\n');
    expect(lines[1]).toMatch(/^ABCDEFGHIJKLMNOPQRSTUVWXYZ/);
  });
});
