import { IExternalCommand } from '@jupyterlite/cockle';
import { expect } from '@playwright/test';
import { test } from '../utils';

test.describe('external command', () => {
  test('should register', async ({ page }) => {
    const output = await page.evaluate(async () => {
      const { externalCommand, shellSetupEmpty } = globalThis.cockle;
      const { shell, output } = await shellSetupEmpty();
      const ok = await shell.registerExternalCommand({
        name: 'external-cmd',
        command: externalCommand
      });
      await shell.inputLine('cockle-config -c');
      return [ok, output.text];
    });
    expect(output[0]).toBeTruthy();
    expect(output[1]).toMatch('│ external-cmd  │ <external>');
  });

  test('should fail when re-register same name', async ({ page }) => {
    const output = await page.evaluate(async () => {
      const { externalCommand, shellSetupEmpty } = globalThis.cockle;
      const { shell } = await shellSetupEmpty();
      const ok0 = await shell.registerExternalCommand({
        name: 'external-cmd',
        command: externalCommand
      });
      const ok1 = await shell.registerExternalCommand({
        name: 'external-cmd',
        command: externalCommand
      });
      return [ok0, ok1];
    });
    expect(output[0]).toBeTruthy();
    expect(output[1]).toBeFalsy();
  });

  test('should write to stdout', async ({ page }) => {
    const output = await page.evaluate(async () => {
      const { externalCommand, shellSetupEmpty } = globalThis.cockle;
      const { shell, output } = await shellSetupEmpty();
      await shell.registerExternalCommand({ name: 'external-cmd', command: externalCommand });
      await shell.inputLine('external-cmd stdout');
      return output.text;
    });
    expect(output).toMatch('\r\nOutput line 1\r\nOutput line 2\r\n');
  });

  test('should write to file', async ({ page }) => {
    const output = await page.evaluate(async () => {
      const { externalCommand, shellSetupEmpty } = globalThis.cockle;
      const { shell, output } = await shellSetupEmpty();
      await shell.registerExternalCommand({ name: 'external-cmd', command: externalCommand });
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
      const { shell, output } = await shellSetupEmpty();
      await shell.registerExternalCommand({ name: 'external-cmd', command: externalCommand });
      await shell.inputLine('external-cmd stderr > out.txt');
      return output.text;
    });
    expect(output).toMatch('Error message\r\n');
  });

  test('should return exit code', async ({ page }) => {
    const output = await page.evaluate(async () => {
      const { externalCommand, shellSetupEmpty } = globalThis.cockle;
      const { shell, output } = await shellSetupEmpty();
      await shell.registerExternalCommand({ name: 'external-cmd', command: externalCommand });
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
      const { shell, output } = await shellSetupEmpty();
      await shell.registerExternalCommand({ name: 'external-cmd', command: externalCommand });
      await shell.inputLine('external-cmd environment');
      output.clear();
      await shell.inputLine('env | grep TEST_VAR');
      return output.text;
    });
    expect(output).toMatch('\r\nTEST_VAR=23\r\n');
  });

  test('should be passed command name', async ({ page }) => {
    const output = await page.evaluate(async () => {
      const { externalCommand, shellSetupEmpty } = globalThis.cockle;
      const { shell, output } = await shellSetupEmpty();
      await shell.registerExternalCommand({ name: 'external-cmd', command: externalCommand });
      await shell.inputLine('external-cmd name');
      return output.text;
    });
    expect(output).toMatch('\r\nexternal-cmd\r\n');
  });
});
