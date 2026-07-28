import { expect } from '@playwright/test';
import { shellLineSimple, test } from '../utils';

test.describe('git2cpp command', () => {
  test('should write version', async ({ page }) => {
    const output = await shellLineSimple(page, 'git -v');
    const lines = output.split('\r\n');
    expect(lines[1]).toMatch('git2cpp version ');
    expect(lines[1]).toMatch(' (libgit2 ');
  });

  test('should error on unknown argument', async ({ page }) => {
    const output = await page.evaluate(async cmdName => {
      const { shell, output } = await globalThis.cockle.shellSetupEmpty();
      await shell.inputLine('git --unknown');
      return [await shell.exitCode(), output.text];
    });
    expect(output[0]).toBe(109);
    const lines = output[1].split('\r\n');
    expect(lines[1]).toBe('The following argument was not expected: --unknown');
  });

  test('should support git init and commit workflow', async ({ page }) => {
    // Simple init, add, commit, status, log workflow.
    const output = await page.evaluate(async cmdName => {
      const { shell, output } = await globalThis.cockle.shellSetupEmpty();

      await shell.inputLine('git init .');
      const ret = [await shell.exitCode(), output.textAndClear()];

      await shell.inputLine('tree -aC .');
      ret.push(await shell.exitCode(), output.textAndClear());

      await shell.inputLine('echo Hello > file.txt');
      await shell.inputLine('git add file.txt');
      ret.push(await shell.exitCode(), output.textAndClear());

      await shell.inputLine('git commit -m "My commit message"');
      ret.push(await shell.exitCode(), output.textAndClear());

      await shell.inputLine('git status');
      ret.push(await shell.exitCode(), output.textAndClear());

      await shell.inputLine('git log');
      ret.push(await shell.exitCode(), output.textAndClear());

      await shell.inputLine('rm -rf .git file.txt');
      ret.push(await shell.exitCode());
      output.clear();
      await shell.inputLine('ls -a');
      ret.push(await shell.exitCode(), output.textAndClear());

      return ret;
    });

    // git init
    expect(output[0]).toBe(0);

    // tree
    expect(output[2]).toBe(0);
    expect(output[3]).toMatch(
      'tree -aC .\r\n' +
        '.\r\n' +
        '└── .git\r\n' +
        '    ├── HEAD\r\n' +
        '    ├── config\r\n' +
        '    ├── description\r\n' +
        '    ├── hooks\r\n' +
        '    │   └── README.sample\r\n' +
        '    ├── info\r\n' +
        '    │   └── exclude\r\n' +
        '    ├── objects\r\n' +
        '    │   ├── info\r\n' +
        '    │   └── pack\r\n' +
        '    └── refs\r\n' +
        '        ├── heads\r\n' +
        '        └── tags\r\n' +
        '\r\n' +
        '10 directories, 5 files\r\n'
    );

    // git add
    expect(output[4]).toBe(0);

    // git commit
    expect(output[6]).toBe(0);

    // git status
    expect(output[8]).toBe(0);
    expect(output[9]).toMatch('\r\nOn branch master\r\n');
    expect(output[9]).toMatch('\r\nNothing to commit, working tree clean\r\n');

    // git log
    expect(output[10]).toBe(0);
    expect(output[11]).toMatch(/commit [0-9A-Fa-f]{40}/);
    expect(output[11]).toMatch(/Author:\s+Jane Doe\s+jane.doe@blabla.com/);
    expect(output[11]).toMatch(/Date:\s+/);
    expect(output[11]).toMatch('My commit message');

    // rm -rf
    expect(output[12]).toBe(0);
    expect(output[13]).toBe(0);
    expect(output[14]).toMatch('ls -a\r\n.  ..\r\n');
  });

  test('should support git init --bare', async ({ page }) => {
    const output = await page.evaluate(async cmdName => {
      const { shell, output } = await globalThis.cockle.shellSetupEmpty();

      await shell.inputLine('git init --bare');
      const ret = [await shell.exitCode(), output.textAndClear()];

      await shell.inputLine('tree -aC .');
      ret.push(await shell.exitCode(), output.textAndClear());

      await shell.inputLine('rm -rf *');
      ret.push(await shell.exitCode());
      output.clear();
      await shell.inputLine('ls -a');
      ret.push(await shell.exitCode(), output.textAndClear());

      return ret;
    });

    // git init --bare
    expect(output[0]).toBe(0);
    expect(output[1]).toMatch('\r\nInitialized empty Git repository in /drive/\r\n');

    // tree
    expect(output[2]).toBe(0);
    expect(output[3]).toMatch(
      'tree -aC .\r\n' +
        '.\r\n' +
        '├── HEAD\r\n' +
        '├── config\r\n' +
        '├── description\r\n' +
        '├── hooks\r\n' +
        '│   └── README.sample\r\n' +
        '├── info\r\n' +
        '│   └── exclude\r\n' +
        '├── objects\r\n' +
        '│   ├── info\r\n' +
        '│   └── pack\r\n' +
        '└── refs\r\n' +
        '    ├── heads\r\n' +
        '    └── tags\r\n' +
        '\r\n' +
        '9 directories, 5 files\r\n'
    );

    // rm -rf
    expect(output[4]).toBe(0);
    expect(output[5]).toBe(0);
    expect(output[6]).toMatch('ls -a\r\n.  ..\r\n');
  });

  test('should clone repo', async ({ page }) => {
    const output = await page.evaluate(async cmdName => {
      const { shell, output } = await globalThis.cockle.shellSetupEmpty();

      await shell.inputLine('git clone https://github.com/ianthomas23/cockle-playground');
      const ret = [await shell.exitCode(), output.textAndClear()];

      await shell.inputLine('cd cockle-playground');
      ret.push(await shell.exitCode(), output.textAndClear());

      await shell.inputLine('git status');
      ret.push(await shell.exitCode(), output.textAndClear());

      await shell.inputLine('git log -n 1');
      ret.push(await shell.exitCode(), output.textAndClear());

      await shell.inputLine('cd ..; rm -rf cockle-playground');
      ret.push(await shell.exitCode());
      output.clear();
      await shell.inputLine('ls -a');
      ret.push(await shell.exitCode(), output.textAndClear());

      return ret;
    });

    // git clone
    expect(output[0]).toBe(0);
    const lines = output[1].split('\r\n');
    expect(lines[1]).toBe("Cloning into 'cockle-playground'...");
    expect(lines.at(-2)).toMatch(/^Resolving deltas: .* done\.$/);

    // cd cockle-playground
    expect(output[2]).toBe(0);

    // git status
    expect(output[4]).toBe(0);
    expect(output[5]).toMatch('\r\nOn branch main\r\n');
    expect(output[5]).toMatch('\r\nNothing to commit, working tree clean\r\n');

    // git log
    expect(output[6]).toBe(0);
    expect(output[7]).toMatch(/commit [0-9A-Fa-f]{40}/);
    expect(output[7]).toMatch(/Author:\s/);
    expect(output[7]).toMatch(/Date:\s+/);

    // rm -rf
    expect(output[8]).toBe(0);
    expect(output[9]).toBe(0);
    expect(output[10]).toMatch('ls -a\r\n.  ..\r\n');
  });

  const stdinOptions = ['sab', 'sw'];
  stdinOptions.forEach(stdinOption => {
    test(`should accept commit message from stdin via ${stdinOption}`, async ({
      page,
      supportsSAB
    }) => {
      test.skip(stdinOption === 'sab' && !supportsSAB, 'SAB not available');
      const output = await page.evaluate(async stdinOption => {
        const { keys, shellSetupSimple, terminalInput } = globalThis.cockle;
        const { shell, output } = await shellSetupSimple({ stdinOption });
        await shell.inputLine('git init .');
        await shell.inputLine('git add file1');
        const cmd = shell.inputLine('git commit');
        await terminalInput(shell, ['M', 's', 'd', keys.backspace, 'g', keys.enter]);
        await cmd;
        output.clear();
        await shell.inputLine('git log');
        return output.text;
      }, stdinOption);
      const lines = output.split('\r\n');
      expect(lines[1]).toMatch(/commit\s+/);
      expect(lines[2]).toMatch(/^Author:\s+/);
      expect(lines[3]).toMatch(/^Date:\s+/);
      expect(lines[5]).toMatch(/^\s+Msg$/);
    });

    test(`should abort commit message from stdin via ${stdinOption}`, async ({
      page,
      supportsSAB
    }) => {
      test.skip(stdinOption === 'sab' && !supportsSAB, 'SAB not available');
      const output = await page.evaluate(async stdinOption => {
        const { keys, shellSetupSimple, terminalInput } = globalThis.cockle;
        const { shell, output } = await shellSetupSimple({ stdinOption });
        await shell.inputLine('git init .');
        await shell.inputLine('git add file1');
        output.clear();
        const cmd = shell.inputLine('git commit');
        await terminalInput(shell, ['M', keys.backspace, keys.backspace, keys.enter]);
        await cmd;
        return [await shell.exitCode(), output.text];
      }, stdinOption);
      expect(output[0]).toBe(1);
      expect(output[1]).toMatch('Aborting, no commit message specified.');
    });
  });
});
