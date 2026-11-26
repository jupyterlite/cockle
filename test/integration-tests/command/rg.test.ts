import { expect } from '@playwright/test';
import { shellLineSimple, shellLineSimpleN, test } from '../utils';

test.describe('rg command', () => {
  test('should write to stdout', async ({ page }) => {
    const output = await shellLineSimple(page, 'rg -N cond file2');
    expect(output).toMatch(/^rg -N cond file2\r\nSecond line\r\n/);
  });

  test('should report error and exit status for missing file', async ({ page }) => {
    const output = await shellLineSimpleN(page, ['rg cond nosuchfile', 'echo $?']);
    expect(output[0]).toMatch(/rg: nosuchfile: .*No such file or directory/);
    expect(output[1]).toMatch('echo $?\r\n2\r\n');
  });

  test('should search directories recursively', async ({ page }) => {
    const options = {
      initialFiles: { 'dirA/file3': 'no match here\nAnother line\n', 'dirA/file4': 'nothing' }
    };
    const output = await shellLineSimple(page, 'rg -n --no-heading --sort path line .', options);
    expect(output).toMatch(
      /^rg -n --no-heading --sort path line \.\r\n\.\/dirA\/file3:2:Another line\r\n\.\/file2:2:Second line\r\n/
    );
  });

  test('should accept redirected input', async ({ page }) => {
    const output = await shellLineSimple(page, 'rg -N cond < file2');
    expect(output).toMatch(/^rg -N cond < file2\r\nSecond line\r\n/);
  });

  test('should accept input from pipe', async ({ page }) => {
    const output = await shellLineSimple(page, 'cat file2 | rg -N cond');
    expect(output).toMatch(/^cat file2 \| rg -N cond\r\nSecond line\r\n/);
  });

  const stdinOptions: string[] = ['sab', 'sw'];
  stdinOptions.forEach(stdinOption => {
    test(`should accept stdin via ${stdinOption}`, async ({ page, supportsSAB }) => {
      test.skip(stdinOption === 'sab' && !supportsSAB, 'SAB not available');
      const output = await page.evaluate(async stdinOption => {
        const { keys, shellSetupEmpty, terminalInput } = globalThis.cockle;
        const { shell, output } = await shellSetupEmpty({ stdinOption });
        const { enter, EOT } = keys;
        const cmd = shell.inputLine('rg -N o -');
        await terminalInput(shell, [...('xyz' + enter + 'aobc' + enter + EOT)]);
        await cmd;
        return output.text;
      }, stdinOption);
      expect(output).toMatch(/^rg -N o -\r\nxyz\r\naobc\r\naobc\r\n/);
    });

    test(`should accept patterns from stdin via ${stdinOption}`, async ({ page, supportsSAB }) => {
      test.skip(stdinOption === 'sab' && !supportsSAB, 'SAB not available');
      const output = await page.evaluate(async stdinOption => {
        const { keys, shellSetupSimple, terminalInput } = globalThis.cockle;
        const { shell, output } = await shellSetupSimple({ stdinOption });
        const { enter, EOT } = keys;
        const cmd = shell.inputLine('rg -N -f - file2');
        await terminalInput(shell, [...('cond' + enter + EOT)]);
        await cmd;
        return output.text;
      }, stdinOption);
      expect(output).toMatch(/^rg -N -f - file2\r\ncond\r\nSecond line\r\n/);
    });
  });
});
