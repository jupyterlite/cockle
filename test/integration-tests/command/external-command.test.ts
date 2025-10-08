import { expect } from '@playwright/test';
import { test } from '../utils';

const cmdName = ['external-cmd', 'external-tab'];
cmdName.forEach(cmdName => {
  test.describe(cmdName, () => {
    test.describe('external command', () => {
      test('should register', async ({ page }) => {
        const output = await page.evaluate(async cmdName => {
          const { externalCommands, shellSetupEmpty } = globalThis.cockle;
          const { shell, output } = await shellSetupEmpty({ externalCommands });
          await shell.inputLine(`cockle-config command ${cmdName}`);
          return output.text;
        }, cmdName);
        expect(output).toMatch(`│ ${cmdName} │ <external>`);
      });
    });

    test('should write to stdout', async ({ page }) => {
      const output = await page.evaluate(async cmdName => {
        const { externalCommands, shellSetupEmpty } = globalThis.cockle;
        const { shell, output } = await shellSetupEmpty({ externalCommands });
        await shell.inputLine(`${cmdName} stdout`);
        return output.text;
      }, cmdName);
      expect(output).toMatch('\r\nOutput line 1\r\nOutput line 2\r\n');
    });

    test('should write to file', async ({ page }) => {
      const output = await page.evaluate(async cmdName => {
        const { externalCommands, shellSetupEmpty } = globalThis.cockle;
        const { shell, output } = await shellSetupEmpty({ externalCommands });
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
        const { externalCommands, shellSetupEmpty } = globalThis.cockle;
        const { shell, output } = await shellSetupEmpty({ externalCommands });
        await shell.inputLine(`${cmdName} stderr > out.txt`);
        return output.text;
      }, cmdName);
      expect(output).toMatch('Error message\r\n');
    });

    test('should return exit code', async ({ page }) => {
      const exitCodes = await page.evaluate(async cmdName => {
        const { externalCommands, shellSetupEmpty } = globalThis.cockle;
        const { shell } = await shellSetupEmpty({ externalCommands });
        await shell.inputLine(cmdName);
        const exitCode0 = await shell.exitCode();
        await shell.inputLine(`${cmdName} exitCode`);
        const exitCode1 = await shell.exitCode();
        return [exitCode0, exitCode1];
      }, cmdName);
      expect(exitCodes).toEqual([0, 1]);
    });

    test('should set new environment variable', async ({ page }) => {
      const output = await page.evaluate(async cmdName => {
        const { externalCommands, shellSetupEmpty } = globalThis.cockle;
        const { shell, output } = await shellSetupEmpty({ externalCommands });
        await shell.inputLine(`${cmdName} environment`);
        output.clear();
        await shell.inputLine('env | grep TEST_VAR');
        return output.text;
      }, cmdName);
      expect(output).toMatch('\r\nTEST_VAR=23\r\n');
    });

    test('should change environment variable', async ({ page }) => {
      const output = await page.evaluate(async cmdName => {
        const { externalCommands, shellSetupEmpty } = globalThis.cockle;
        const { shell, output } = await shellSetupEmpty({ externalCommands });
        await shell.inputLine('export TEST_VAR=999');
        output.clear();
        await shell.inputLine('env | grep TEST_VAR');
        const ret0 = output.textAndClear();
        await shell.inputLine(`${cmdName} environment`);
        output.clear();
        await shell.inputLine('env | grep TEST_VAR');
        return [ret0, output.text];
      }, cmdName);
      expect(output[0]).toMatch('\r\nTEST_VAR=999\r\n');
      expect(output[1]).toMatch('\r\nTEST_VAR=23\r\n');
    });

    test('should delete environment variable', async ({ page }) => {
      const output = await page.evaluate(async cmdName => {
        const { externalCommands, shellSetupEmpty } = globalThis.cockle;
        const { shell, output } = await shellSetupEmpty({ externalCommands });
        await shell.inputLine('export TEST_VAR2=9876');
        output.clear();
        await shell.inputLine('env | grep TEST_VAR2');
        const text0 = output.textAndClear();
        const exitCode0 = await shell.exitCode();
        await shell.inputLine(`${cmdName} environment`); // Sets TEST_JS_VAR, deletes TEST_JS_VAR2
        output.clear();
        await shell.inputLine('env | grep TEST_VAR2');
        const text1 = output.textAndClear();
        const exitCode1 = await shell.exitCode();
        return [text0, exitCode0, text1, exitCode1];
      }, cmdName);

      let lines = output[0].split('\r\n');
      expect(lines).toHaveLength(3);
      expect(lines[1]).toEqual('TEST_VAR2=9876');
      //expect(output[1]).toEqual(0);  // TODO: this is 1 but should be 0 ???

      lines = output[2].split('\r\n');
      expect(lines).toHaveLength(2);
      expect(output[3]).toEqual(1);
    });

    test('should be passed command name', async ({ page }) => {
      const output = await page.evaluate(async cmdName => {
        const { externalCommands, shellSetupEmpty } = globalThis.cockle;
        const { shell, output } = await shellSetupEmpty({ externalCommands });
        await shell.inputLine(`${cmdName} name`);
        return output.text;
      }, cmdName);
      expect(output).toMatch(`\r\n${cmdName}\r\n`);
    });

    test('should read from pipe', async ({ page }) => {
      const output = await page.evaluate(async cmdName => {
        const { externalCommands, shellSetupSimple } = globalThis.cockle;
        const { shell, output } = await shellSetupSimple({ externalCommands });
        await shell.inputLine(`cat file2 | ${cmdName} stdin`);
        return output.text;
      }, cmdName);
      expect(output).toMatch(`cat file2 | ${cmdName} stdin\r\nSOME OTHER FILE\r\nSECOND LINE\r\n`);
    });

    test('should read from file', async ({ page }) => {
      const output = await page.evaluate(async cmdName => {
        const { externalCommands, shellSetupSimple } = globalThis.cockle;
        const { shell, output } = await shellSetupSimple({ externalCommands });
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
            const { externalCommands, keys, shellSetupEmpty } = globalThis.cockle;
            const { shell, output } = await shellSetupEmpty({ externalCommands, stdinOption });
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
        const { externalCommands, shellSetupEmpty } = globalThis.cockle;
        const { shell, output } = await shellSetupEmpty({ externalCommands });
        await shell.inputLine(`${cmdName} color`);
        return output.text;
      }, cmdName);
      const lines = output.split('\r\n');
      // eslint-disable-next-line no-control-regex
      expect(lines[1]).toMatch(/^\x1b\[38;2;7;128;15mA\x1b\[1;0m/);
    });

    test('should not write color to file', async ({ page }) => {
      const output = await page.evaluate(async cmdName => {
        const { externalCommands, shellSetupEmpty } = globalThis.cockle;
        const { shell, output } = await shellSetupEmpty({ externalCommands });
        await shell.inputLine(`${cmdName} color > out`);
        output.clear();
        await shell.inputLine('cat out');
        return output.text;
      }, cmdName);
      const lines = output.split('\r\n');
      expect(lines[1]).toMatch(/^ABCDEFGHIJKLMNOPQRSTUVWXYZ/);
    });

    test('should write shellId', async ({ page }) => {
      const output = await page.evaluate(async cmdName => {
        const { externalCommands, shellSetupEmpty } = globalThis.cockle;
        const { shell, output } = await shellSetupEmpty({
          externalCommands,
          shellId: 'someShellId9876'
        });
        await shell.inputLine(`${cmdName} shellId`);
        return output.text;
      }, cmdName);
      expect(output).toMatch('\r\nshellId: someShellId9876\r\n');
    });
  });
});

test.describe('tab complete js-tab command', () => {
  test('should show all positional arguments', async ({ page }) => {
    const output = await page.evaluate(async cmdName => {
      const { externalCommands, shellSetupEmpty, terminalInput } = globalThis.cockle;
      const { shell, output } = await shellSetupEmpty({ externalCommands });
      await terminalInput(shell, ['e', 'x', 't', '\t', 't', '\t', '\t']);
      return output.text;
    });
    const lines = output.split('\r\n');
    expect(lines[1]).toEqual('color        exitCode     shellId      stdin');
    expect(lines[2]).toEqual('environment  name         stderr       stdout');
  });

  test('should match the single possible starting with letter n', async ({ page }) => {
    const output = await page.evaluate(async cmdName => {
      const { externalCommands, shellSetupEmpty, terminalInput } = globalThis.cockle;
      const { shell, output } = await shellSetupEmpty({ externalCommands });
      await terminalInput(shell, ['e', 'x', 't', '\t', 't', '\t', 'n', '\t']);
      return output.text;
    });
    expect(output).toMatch(/^external-tab name $/);
  });

  test('should complete common start string st', async ({ page }) => {
    const output = await page.evaluate(async cmdName => {
      const { externalCommands, shellSetupEmpty, terminalInput } = globalThis.cockle;
      const { shell, output } = await shellSetupEmpty({ externalCommands });
      await terminalInput(shell, ['e', 'x', 't', '\t', 't', '\t', 's', 't', '\t']);
      return output.text;
    });
    expect(output).toMatch(/^external-tab std$/);
  });

  test('should show all possible matches starting with std', async ({ page }) => {
    const output = await page.evaluate(async cmdName => {
      const { externalCommands, shellSetupEmpty, terminalInput } = globalThis.cockle;
      const { shell, output } = await shellSetupEmpty({ externalCommands });
      await terminalInput(shell, ['e', 'x', 't', '\t', 't', '\t', 's', 't', 'd', '\t']);
      return output.text;
    });
    expect(output).toMatch(/^external-tab std\r\nstderr {2}stdin {3}stdout\r\n/);
  });

  test('should match two separate possible arguments', async ({ page }) => {
    const output = await page.evaluate(async cmdName => {
      const { externalCommands, shellSetupEmpty, terminalInput } = globalThis.cockle;
      const { shell, output } = await shellSetupEmpty({ externalCommands });
      await terminalInput(shell, ['e', 'x', 't', '\t', 't', '\t', 'n', '\t', 'e', 'x', '\t']);
      return output.text;
    });
    expect(output).toMatch(/^external-tab name exitCode $/);
  });

  test('should complete last external command name', async ({ page }) => {
    const output = await page.evaluate(async cmdName => {
      const { externalCommands, shellSetupEmpty, terminalInput } = globalThis.cockle;
      const { shell, output } = await shellSetupEmpty({ externalCommands });
      await terminalInput(shell, ['u', 'n', 'a', '\t', ';', 'e', 'x', 't', '\t', 't', '\t']);
      return output.text;
    });
    expect(output).toMatch(/^uname ;external-tab $/);
  });

  test('should complete last external command argument', async ({ page }) => {
    const output = await page.evaluate(async cmdName => {
      const { externalCommands, shellSetupEmpty, terminalInput } = globalThis.cockle;
      const { shell, output } = await shellSetupEmpty({ externalCommands });
      await terminalInput(shell, [
        'u',
        'n',
        'a',
        '\t',
        ';',
        'e',
        'x',
        't',
        '\t',
        't',
        '\t',
        'c',
        '\t'
      ]);
      return output.text;
    });
    expect(output).toMatch(/^uname ;external-tab color $/);
  });
});
