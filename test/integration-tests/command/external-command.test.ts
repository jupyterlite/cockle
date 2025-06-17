import { expect } from '@playwright/test';
import { test } from '../utils';

test.describe('external command', () => {
  test('should register', async ({ page }) => {
    const output = await page.evaluate(async () => {
      const { externalCommand, shellSetupEmpty } = globalThis.cockle;
      const externalCommands = [{ name: 'external-cmd', command: externalCommand }];
      const { shell, output } = await shellSetupEmpty({ externalCommands });
      await shell.inputLine('cockle-config -c');
      return output.text;
    });
    expect(output).toMatch('│ external-cmd  │ <external>');
  });

  test('should write to stdout', async ({ page }) => {
    const output = await page.evaluate(async () => {
      const { externalCommand, shellSetupEmpty } = globalThis.cockle;
      const externalCommands = [{ name: 'external-cmd', command: externalCommand }];
      const { shell, output } = await shellSetupEmpty({ externalCommands });
      await shell.inputLine('external-cmd stdout');
      return output.text;
    });
    expect(output).toMatch('\r\nOutput line 1\r\nOutput line 2\r\n');
  });

  test('should write to file', async ({ page }) => {
    const output = await page.evaluate(async () => {
      const { externalCommand, shellSetupEmpty } = globalThis.cockle;
      const externalCommands = [{ name: 'external-cmd', command: externalCommand }];
      const { shell, output } = await shellSetupEmpty({ externalCommands });
      await shell.inputLine('external-cmd stdout > out.txt');
      const out0 = output.textAndClear();
      await shell.inputLine('cat out.txt');
      return [out0, output.text];
    });
    expect(output[0]).not.toMatch('Output line');
    expect(output[1]).toMatch('cat out.txt\r\nOutput line 1\r\nOutput line 2\r\n');
  });

  test('should write to stderr', async ({ page }) => {
    const output = await page.evaluate(async () => {
      const { externalCommand, shellSetupEmpty } = globalThis.cockle;
      const externalCommands = [{ name: 'external-cmd', command: externalCommand }];
      const { shell, output } = await shellSetupEmpty({ externalCommands });
      await shell.inputLine('external-cmd stderr > out.txt');
      return output.text;
    });
    expect(output).toMatch('Error message\r\n');
  });

  test('should return exit code', async ({ page }) => {
    const output = await page.evaluate(async () => {
      const { externalCommand, shellSetupEmpty } = globalThis.cockle;
      const externalCommands = [{ name: 'external-cmd', command: externalCommand }];
      const { shell, output } = await shellSetupEmpty({ externalCommands });
      await shell.inputLine('external-cmd');
      output.clear();
      await shell.inputLine('env | grep ?');
      const ret0 = output.textAndClear();
      await shell.inputLine('external-cmd exitCode');
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
      const { externalCommand, shellSetupEmpty } = globalThis.cockle;
      const externalCommands = [{ name: 'external-cmd', command: externalCommand }];
      const { shell, output } = await shellSetupEmpty({ externalCommands });
      await shell.inputLine('external-cmd environment');
      output.clear();
      await shell.inputLine('env | grep TEST_VAR');
      return output.text;
    });
    expect(output).toMatch('\r\nTEST_VAR=23\r\n');
  });

  test('should change environment variable', async ({ page }) => {
    const output = await page.evaluate(async () => {
      const { externalCommand, shellSetupEmpty } = globalThis.cockle;
      const externalCommands = [{ name: 'external-cmd', command: externalCommand }];
      const { shell, output } = await shellSetupEmpty({ externalCommands });
      await shell.inputLine('export TEST_VAR=999');
      output.clear();
      await shell.inputLine('env | grep TEST_VAR');
      const ret0 = output.textAndClear();
      await shell.inputLine('external-cmd environment');
      output.clear();
      await shell.inputLine('env | grep TEST_VAR');
      return [ret0, output.text];
    });
    expect(output[0]).toMatch('\r\nTEST_VAR=999\r\n');
    expect(output[1]).toMatch('\r\nTEST_VAR=23\r\n');
  });

  test('should delete environment variable', async ({ page }) => {
    const output = await page.evaluate(async () => {
      const { externalCommand, shellSetupEmpty } = globalThis.cockle;
      const externalCommands = [{ name: 'external-cmd', command: externalCommand }];
      const { shell, output } = await shellSetupEmpty({ externalCommands });
      await shell.inputLine('export TEST_VAR2=9876');
      output.clear();
      await shell.inputLine('env | grep TEST_VAR2');
      const ret0 = output.textAndClear();
      await shell.inputLine('external-cmd environment');
      output.clear();
      await shell.inputLine('env | grep TEST_VAR2');
      await shell.inputLine('env | grep ?'); // Check error code
      return [ret0, output.text];
    });
    expect(output[0]).toMatch('\r\nTEST_VAR2=9876\r\n');
    expect(output[1]).toMatch('\r\n?=1\r\n');
  });

  test('should be passed command name', async ({ page }) => {
    const output = await page.evaluate(async () => {
      const { externalCommand, shellSetupEmpty } = globalThis.cockle;
      const externalCommands = [{ name: 'external-cmd', command: externalCommand }];
      const { shell, output } = await shellSetupEmpty({ externalCommands });
      await shell.inputLine('external-cmd name');
      return output.text;
    });
    expect(output).toMatch('\r\nexternal-cmd\r\n');
  });

  test('should read from pipe', async ({ page }) => {
    const output = await page.evaluate(async () => {
      const { externalCommand, shellSetupSimple } = globalThis.cockle;
      const externalCommands = [{ name: 'external-cmd', command: externalCommand }];
      const { shell, output } = await shellSetupSimple({ externalCommands });
      await shell.inputLine('cat file2 | external-cmd stdin');
      return output.text;
    });
    expect(output).toMatch(/^cat file2 | external-cmd stdin\r\nSOME OTHER FILE\r\nSECOND LINE\r\n/);
  });

  test('should read from file', async ({ page }) => {
    const output = await page.evaluate(async () => {
      const { externalCommand, shellSetupSimple } = globalThis.cockle;
      const externalCommands = [{ name: 'external-cmd', command: externalCommand }];
      const { shell, output } = await shellSetupSimple({ externalCommands });
      await shell.inputLine('external-cmd stdin < file2');
      return output.text;
    });
    expect(output).toMatch(/^external-cmd stdin < file2\r\nSOME OTHER FILE\r\nSECOND LINE\r\n/);
  });

  const stdinOptions = ['sab', 'sw'];
  stdinOptions.forEach(stdinOption => {
    test(`should read from stdin via ${stdinOption}`, async ({ page }) => {
      const output = await page.evaluate(async stdinOption => {
        const { externalCommand, keys, shellSetupEmpty } = globalThis.cockle;
        const externalCommands = [{ name: 'external-cmd', command: externalCommand }];
        const { shell, output } = await shellSetupEmpty({ externalCommands, stdinOption });
        await Promise.all([
          shell.inputLine('external-cmd stdin'),
          globalThis.cockle.terminalInput(shell, ['a', 'B', ' ', 'c', keys.EOT])
        ]);
        return output.text;
      });
      expect(output).toMatch(/^external-cmd stdin\r\naABB {2}cC\r\n/);
    });
  });
});
