import { expect } from '@playwright/test';
import { shellLineSimple, shellLineSimpleN, test } from '../utils';

test.describe('grep command', () => {
  test('should write to stdout', async ({ page }) => {
    const output = await shellLineSimple(page, 'grep cond file2');
    expect(output).toMatch(/^grep cond file2\r\nSecond line\r\n/);
  });

  test('should accept redirected input', async ({ page }) => {
    const output = await shellLineSimple(page, 'grep cond < file2');
    expect(output).toMatch(/^grep cond < file2\r\nSecond line\r\n/);
  });

  test('should accept input from pipe', async ({ page }) => {
    const output = await shellLineSimple(page, 'cat file2 | grep cond');
    expect(output).toMatch(/^cat file2 | grep cond\r\nSecond line\r\n/);
  });

  test('should support ^ and $', async ({ page }) => {
    const options = { initialFiles: { file3: ' hello\nhello ' } };
    const output = await shellLineSimpleN(
      page,
      ['grep hello file3', 'grep ^hello file3', 'grep hello$ file3'],
      options
    );
    expect(output[0]).toMatch(/^grep hello file3\r\n hello\r\nhello \r\n/);
    expect(output[1]).toMatch(/^grep \^hello file3\r\nhello \r\n/);
    expect(output[2]).toMatch(/^grep hello\$ file3\r\n hello\r\n/);
  });

  const stdinOptions = ['sab', 'sw'];
  stdinOptions.forEach(stdinOption => {
    test(`should accept stdin via ${stdinOption}`, async ({ page }) => {
      const output = await page.evaluate(async stdinOption => {
        const { keys, shellSetupEmpty, terminalInput } = globalThis.cockle;
        const { shell, output } = await shellSetupEmpty({ stdinOption });
        const { enter, EOT } = keys;
        const cmd = shell.inputLine('grep o');
        await terminalInput(shell, [...('xyz' + enter + 'aobc' + enter + EOT)]);
        await cmd;
        return output.text;
      }, stdinOption);
      expect(output).toMatch(/^grep o\r\nxyz\r\naobc\r\naobc\r\n/);
    });

    test(`should accept stdin backspace via ${stdinOption}`, async ({ page }) => {
      const output = await page.evaluate(async stdinOption => {
        const { keys, shellSetupEmpty, terminalInput } = globalThis.cockle;
        const { shell, output } = await shellSetupEmpty({ stdinOption });
        const { backspace, enter, EOT } = keys;
        const cmd = shell.inputLine('grep o');
        await terminalInput(shell, [...('aoboc' + backspace + enter + EOT)]);
        await cmd;
        return output.text;
      }, stdinOption);
      const lines = output.split('\r\n');
      expect(lines[2]).toBe('aobo'); // Check output line but not input line.
    });
  });
});
