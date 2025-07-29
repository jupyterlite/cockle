import { expect } from '@playwright/test';
import { shellInputsSimple, test } from '../utils';

const cmdName = ['js-test', 'js-tab'];
cmdName.forEach(cmdName => {
  test.describe(cmdName, () => {
    test('should register', async ({ page }) => {
      const output = await page.evaluate(async cmdName => {
        const { shell, output } = await globalThis.cockle.shellSetupEmpty();
        await shell.inputLine(`cockle-config command ${cmdName}`);
        return output.text;
      }, cmdName);
      expect(output).toMatch(`│ ${cmdName.padEnd(7)} │ ${cmdName} │`);
    });

    test('should write to stdout', async ({ page }) => {
      const output = await page.evaluate(async cmdName => {
        const { shell, output } = await globalThis.cockle.shellSetupEmpty();
        await shell.inputLine(`${cmdName} stdout`);
        return output.text;
      }, cmdName);
      expect(output).toMatch('\r\nOutput line 1\r\nOutput line 2\r\n');
    });

    test('should write to file', async ({ page }) => {
      const output = await page.evaluate(async cmdName => {
        const { shell, output } = await globalThis.cockle.shellSetupEmpty();
        await shell.inputLine(`${cmdName} stdout > out.txt`);
        const out0 = output.textAndClear();
        await shell.inputLine('cat out.txt');
        return [out0, output.text];
      }, cmdName);
      expect(output[0]).not.toMatch('Output line');
      expect(output[1]).toMatch('cat out.txt\r\nOutput line 1\r\nOutput line 2\r\n');
    });

    test('should write to stderr', async ({ page }) => {
      const output = await page.evaluate(async cmdName => {
        const { shell, output } = await globalThis.cockle.shellSetupEmpty();
        await shell.inputLine(`${cmdName} stderr > out.txt`);
        return output.text;
      }, cmdName);
      expect(output).toMatch('Error message\r\n');
    });

    test('should write to named file', async ({ page }) => {
      const output = await page.evaluate(async cmdName => {
        const { shell, output } = await globalThis.cockle.shellSetupEmpty();
        await shell.inputLine(`${cmdName} writefile`);
        output.clear();
        await shell.inputLine('cat writefile.txt');
        return output.text;
      }, cmdName);
      expect(output).toMatch(`\r\nFile written by ${cmdName}\r\n`);
    });

    test('should read from named file', async ({ page }) => {
      const output = await page.evaluate(async cmdName => {
        const { shell, output } = await globalThis.cockle.shellSetupEmpty();
        await shell.inputLine(`${cmdName} readfile`); // Fails, no such file.
        const ret0 = output.textAndClear();
        await shell.inputLine('echo abcdefghij0123456789 > readfile.txt');
        output.clear();
        await shell.inputLine(`${cmdName} readfile`); // Succeeds and echoes to stdout.
        return [ret0, output.text];
      }, cmdName);
      expect(output[0]).toMatch('\r\nUnable to open file readfile.txt for reading\r\n');
      expect(output[1]).toMatch('\r\nabcdefghij0123456789\r\n');
    });

    test('should return exit code', async ({ page }) => {
      const output = await page.evaluate(async cmdName => {
        const { shell, output } = await globalThis.cockle.shellSetupEmpty();
        await shell.inputLine(cmdName);
        output.clear();
        await shell.inputLine('env | grep ?');
        const ret0 = output.textAndClear();
        await shell.inputLine(`${cmdName} exitCode`);
        output.clear();
        await shell.inputLine('env | grep ?');
        const ret1 = output.textAndClear();
        return [ret0, ret1];
      }, cmdName);
      expect(output[0]).toMatch('\r\n?=0\r\n');
      expect(output[1]).toMatch('\r\n?=1\r\n');
    });

    test('should set new environment variable', async ({ page }) => {
      const output = await page.evaluate(async cmdName => {
        const { shell, output } = await globalThis.cockle.shellSetupEmpty();
        await shell.inputLine(`${cmdName} environment`);
        output.clear();
        await shell.inputLine('env | grep TEST_JS_VAR');
        return output.text;
      }, cmdName);
      expect(output).toMatch('\r\nTEST_JS_VAR=123\r\n');
    });

    test('should change environment variable', async ({ page }) => {
      const output = await page.evaluate(async cmdName => {
        const { shell, output } = await globalThis.cockle.shellSetupEmpty();
        await shell.inputLine('export TEST_JS_VAR=abc');
        output.clear();
        await shell.inputLine('env | grep TEST_JS_VAR');
        const ret0 = output.textAndClear();
        await shell.inputLine(`${cmdName} environment`);
        output.clear();
        await shell.inputLine('env | grep TEST_JS_VAR');
        return [ret0, output.text];
      }, cmdName);
      expect(output[0]).toMatch('\r\nTEST_JS_VAR=abc\r\n');
      expect(output[1]).toMatch('\r\nTEST_JS_VAR=123\r\n');
    });

    test('should delete environment variable', async ({ page }) => {
      const output = await page.evaluate(async cmdName => {
        const { shell, output } = await globalThis.cockle.shellSetupEmpty();
        await shell.inputLine('export TEST_JS_VAR2=9876');
        output.clear();
        await shell.inputLine('env | grep TEST_JS_VAR2');
        const ret0 = output.textAndClear();
        await shell.inputLine(`${cmdName} environment`);
        output.clear();
        await shell.inputLine('env | grep TEST_JS_VAR2');
        await shell.inputLine('env | grep ?'); // Check error code
        return [ret0, output.text];
      }, cmdName);
      expect(output[0]).toMatch('\r\nTEST_JS_VAR2=9876\r\n');
      expect(output[1]).toMatch('\r\n?=1\r\n');
    });

    test('should be passed command name', async ({ page }) => {
      const output = await page.evaluate(async cmdName => {
        const { shell, output } = await globalThis.cockle.shellSetupEmpty();
        await shell.inputLine(`${cmdName} name`);
        return output.text;
      }, cmdName);
      expect(output).toMatch(`\r\n${cmdName}\r\n`);
    });

    test('should read from pipe', async ({ page }) => {
      const output = await page.evaluate(async cmdName => {
        const { shell, output } = await globalThis.cockle.shellSetupSimple();
        await shell.inputLine(`cat file2 | ${cmdName} stdin`);
        return output.text;
      }, cmdName);
      expect(output).toMatch(`cat file2 | ${cmdName} stdin\r\nSOME OTHER FILE\r\nSECOND LINE\r\n`);
    });

    test('should read from file', async ({ page }) => {
      const output = await page.evaluate(async cmdName => {
        const { shell, output } = await globalThis.cockle.shellSetupSimple();
        await shell.inputLine(`${cmdName} stdin < file2`);
        return output.text;
      }, cmdName);
      expect(output).toMatch(`${cmdName} stdin < file2\r\nSOME OTHER FILE\r\nSECOND LINE\r\n`);
    });

    const stdinOptions = ['sab', 'sw'];
    stdinOptions.forEach(stdinOption => {
      test(`should read from stdin via ${stdinOption}`, async ({ page }) => {
        const output = await page.evaluate(
          async ([stdinOption, cmdName]) => {
            const { keys, shellSetupEmpty } = globalThis.cockle;
            const { shell, output } = await shellSetupEmpty({ stdinOption });
            await Promise.all([
              shell.inputLine(`${cmdName} stdin`),
              globalThis.cockle.terminalInput(shell, ['a', 'B', ' ', 'c', keys.EOT])
            ]);
            return output.text;
          },
          [stdinOption, cmdName]
        );
        expect(output).toMatch(`${cmdName} stdin\r\naABB  cC\r\n`);
      });
    });

    test('should write color to stdout', async ({ page }) => {
      const output = await page.evaluate(async cmdName => {
        const { shell, output } = await globalThis.cockle.shellSetupSimple();
        await shell.inputLine(`${cmdName} color`);
        return output.text;
      }, cmdName);
      const lines = output.split('\r\n');
      // eslint-disable-next-line no-control-regex
      expect(lines[1]).toMatch(/^\x1b\[38;2;7;128;15mA\x1b\[1;0m/);
    });

    test('should not write color to file', async ({ page }) => {
      const output = await page.evaluate(async cmdName => {
        const { shell, output } = await globalThis.cockle.shellSetupSimple();
        await shell.inputLine(`${cmdName} color > out`);
        output.clear();
        await shell.inputLine('cat out');
        return output.text;
      }, cmdName);
      const lines = output.split('\r\n');
      expect(lines[1]).toMatch(/^ABCDEFGHIJKLMNOPQRSTUVWXYZ/);
    });
  });
});

test.describe('tab complete js-tab command', () => {
  test('should show all positional arguments', async ({ page }) => {
    expect(await shellInputsSimple(page, ['j', 's', '-', 't', 'a', '\t', '\t'])).toMatch(
      /^js-tab \r\ncolor {8}exitCode {5}readfile {5}stdin {8}writefile\r\nenvironment {2}name {9}stderr {7}stdout\r\n/
    );
  });

  test('should match the single possible starting with letter w', async ({ page }) => {
    expect(await shellInputsSimple(page, ['j', 's', '-', 't', 'a', '\t', 'w', '\t'])).toMatch(
      /^js-tab writefile $/
    );
  });

  test('should complete common start string s', async ({ page }) => {
    expect(await shellInputsSimple(page, ['j', 's', '-', 't', 'a', '\t', 's', '\t'])).toMatch(
      /^js-tab std$/
    );
  });

  test('should show all possibles starting with std', async ({ page }) => {
    expect(
      await shellInputsSimple(page, ['j', 's', '-', 't', 'a', '\t', 's', 't', 'd', '\t'])
    ).toMatch(/^js-tab std\r\nstderr {2}stdin {3}stdout\r\n/);
  });

  test('should match two separate possibles', async ({ page }) => {
    expect(
      await shellInputsSimple(page, ['j', 's', '-', 't', 'a', '\t', 'w', '\t', 'n', '\t'])
    ).toMatch(/^js-tab writefile name $/);
  });
});
