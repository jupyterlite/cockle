import { expect } from '@playwright/test';
import { shellLineSimpleN, test } from '../utils';

test.describe('unset command', () => {
  test('should unset environment variables', async ({ page }) => {
    const output = await shellLineSimpleN(page, [
      'export ABC1=hello ABC2=goodbye',
      'env | grep ABC',
      'unset ABC1',
      'env | grep ABC',
      'unset ABC2',
      'env | grep ABC'
    ]);
    expect(output[1]).toMatch('\r\nABC1=hello\r\n');
    expect(output[1]).toMatch('\r\nABC2=goodbye\r\n');

    expect(output[3]).not.toMatch('ABC1');
    expect(output[3]).toMatch('\r\nABC2=goodbye\r\n');

    expect(output[5]).not.toMatch('ABC1');
    expect(output[5]).not.toMatch('ABC2');
  });

  test('should ignore missing environment variable', async ({ page }) => {
    const output = await page.evaluate(async () => {
      const { shell, output } = await globalThis.cockle.shellSetupSimple();
      await shell.inputLine('unset NAME_DOES_NOT_EXIST');
      return [output.text, await shell.exitCode()];
    });
    expect(output[1]).toBe(0);
  });

  test('should tab complete environment variable name', async ({ page }) => {
    const output = await page.evaluate(async () => {
      const { shellSetupEmpty, terminalInput } = globalThis.cockle;
      const { shell, output } = await shellSetupEmpty();
      await shell.inputLine('export MY_ENV_VAR=23');
      output.clear();
      await terminalInput(shell, ['u', 'n', 's', 'e', 't', ' ', 'M', 'Y', '_', '\t']);
      return output.text;
    });
    expect(output).toBe('unset MY_ENV_VAR ');
  });

  test('should show all tab completion environment variable names', async ({ page }) => {
    const output = await page.evaluate(async () => {
      const { shellSetupEmpty, terminalInput } = globalThis.cockle;
      const { shell, output } = await shellSetupEmpty();
      await terminalInput(shell, ['u', 'n', 's', 'e', 't', ' ', '\t']);
      return output.text;
    });
    // Check for existence of some specific env vars, do not check all of them.
    expect(output).toMatch('COCKLE_SHELL_ID');
    expect(output).toMatch('COLUMNS');
    expect(output).toMatch('LINES');
    expect(output).toMatch('PS1');
    expect(output).toMatch('PWD');
  });
});
