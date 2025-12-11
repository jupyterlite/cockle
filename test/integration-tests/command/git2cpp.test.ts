import { expect } from '@playwright/test';
import { shellLineSimple, test } from '../utils';

test.describe('git2cpp command', () => {
  test('should write to stdout', async ({ page }) => {
    const output = await shellLineSimple(page, 'git -v');
    const lines = output.split('\r\n');
    expect(lines[1]).toMatch('git2cpp version ');
    expect(lines[1]).toMatch(' (libgit2 ');
  });

  test.skip(true, 'git2cpp init not working...');
  test('should create and modify repo', async ({ page }) => {
    // Simple init, add, commit, status, log workflow.
    const output = await page.evaluate(async cmdName => {
      const { shell, output } = await globalThis.cockle.shellSetupEmpty();

      await shell.inputLine('git init .');
      const text0 = output.textAndClear();
      const exit0 = await shell.exitCode();

      await shell.inputLine('echo Hello > file.txt');
      await shell.inputLine('git add file.txt');
      const text1 = output.textAndClear();
      const exit1 = await shell.exitCode();

      await shell.inputLine('git commit -m "My commit message"');
      const text2 = output.textAndClear();
      const exit2 = await shell.exitCode();

      await shell.inputLine('git status');
      const text3 = output.textAndClear();
      const exit3 = await shell.exitCode();

      await shell.inputLine('git log');
      const text4 = output.textAndClear();
      const exit4 = await shell.exitCode();

      return [exit0, text0, exit1, text1, exit2, text2, exit3, text3, exit4, text4];
    });

    // git init
    expect(output[0]).toBe(0);

    // git add
    expect(output[2]).toBe(0);

    // git commit
    expect(output[4]).toBe(0);

    // git status
    expect(output[6]).toBe(0);
    expect(output[7]).toMatch('\r\nOn branch master\r\n');

    // git log
    expect(output[8]).toBe(0);
    expect(output[9]).toMatch(/commit [0-9A-Fa-f]{40}/);
    expect(output[9]).toMatch(/Author:\s+Jane Doe\s+jane.doe@blabla.com/);
    expect(output[9]).toMatch(/Date:\s+/);
    expect(output[9]).toMatch('My commit message');
  });
});
