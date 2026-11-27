import { expect } from '@playwright/test';
import { describeCoiAndNonCoi, test } from '../utils';

const cmdName = ['external-cmd', 'external-tab'];
cmdName.forEach(cmdName => {
  describeCoiAndNonCoi(cmdName, () => {
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
      test(`should read from stdin via ${stdinOption} line buffered`, async ({
        page,
        supportsSAB
      }) => {
        test.skip(stdinOption === 'sab' && !supportsSAB, 'SAB not available');
        const output = await page.evaluate(
          async ([stdinOption, cmdName]) => {
            const { externalCommands, keys, shellSetupEmpty, terminalInput } = globalThis.cockle;
            const { shell, output } = await shellSetupEmpty({ externalCommands, stdinOption });
            const cmd = shell.inputLine(`${cmdName} stdin`);
            await terminalInput(shell, ['a', 'B', ' ', 'c', '\n', keys.EOT]);
            await cmd;
            return output.text;
          },
          [stdinOption, cmdName]
        );
        expect(output).toMatch(`${cmdName} stdin\r\naB c\r\nAB C\r\n`);
      });

      test(`should read from stdin via ${stdinOption} line buffered with backspace`, async ({
        page,
        supportsSAB
      }) => {
        test.skip(stdinOption === 'sab' && !supportsSAB, 'SAB not available');
        const output = await page.evaluate(
          async ([stdinOption, cmdName]) => {
            const { externalCommands, keys, shellSetupEmpty, terminalInput } = globalThis.cockle;
            const { backspace, EOT } = keys;
            const { shell, output } = await shellSetupEmpty({ externalCommands, stdinOption });
            const cmd = shell.inputLine(`${cmdName} stdin`);
            await terminalInput(shell, ['a', 'b', backspace, 'c', '\n', EOT]);
            await cmd;
            return output.text;
          },
          [stdinOption, cmdName]
        );
        // Only check the output line.
        const lines = output.split('\r\n');
        expect(lines).toHaveLength(4);
        expect(lines[2]).toBe('AC');
      });

      test(`should read from stdin via ${stdinOption} char buffered`, async ({
        page,
        supportsSAB
      }) => {
        test.skip(stdinOption === 'sab' && !supportsSAB, 'SAB not available');
        const output = await page.evaluate(
          async ([stdinOption, cmdName]) => {
            const {
              externalCommands,
              keys,
              shellSetupEmpty,
              terminalInput,
              terminalInputUpperCaseReply
            } = globalThis.cockle;
            const { shell, output } = await shellSetupEmpty({ externalCommands, stdinOption });
            const cmd = shell.inputLine(`${cmdName} stdinchar`);
            await terminalInputUpperCaseReply(shell, output, ['a', 'B', ' ', 'c']);
            await terminalInput(shell, [keys.EOT], 0);
            await cmd;
            return output.text;
          },
          [stdinOption, cmdName]
        );
        expect(output).toMatch(`${cmdName} stdinchar\r\naABB  cC^D\r\n`);
      });

      test(`should read unicode from stdin via ${stdinOption}`, async ({ page, supportsSAB }) => {
        test.skip(stdinOption === 'sab' && !supportsSAB, 'SAB not available');
        const output = await page.evaluate(
          async ([stdinOption, cmdName]) => {
            const {
              externalCommands,
              keys,
              shellSetupEmpty,
              terminalInput,
              terminalInputUpperCaseReply
            } = globalThis.cockle;
            const { shell, output } = await shellSetupEmpty({ externalCommands, stdinOption });
            const cmd = shell.inputLine(`${cmdName} stdinchar`);
            await terminalInputUpperCaseReply(shell, output, ['a', 'B', '⚽', 'c']);
            await terminalInput(shell, [keys.EOT], 0);
            await cmd;
            return output.text;
          },
          [stdinOption, cmdName]
        );
        expect(output).toMatch(`${cmdName} stdinchar\r\naABB⚽⚽cC^D\r\n`);
      });

      test(`should call onPosixSignal callback when size changes whilst reading from stdin via ${stdinOption}`, async ({
        page,
        supportsSAB
      }) => {
        test.skip(stdinOption === 'sab' && !supportsSAB, 'SAB not available');
        const output = await page.evaluate(
          async ([stdinOption, cmdName]) => {
            const { delay, externalCommands, keys, shellSetupEmpty, terminalInput } =
              globalThis.cockle;
            const { shell, output } = await shellSetupEmpty({ externalCommands, stdinOption });
            const cmd = shell.inputLine(`${cmdName} onsignal stdin`);
            await terminalInput(shell, ['a', '\n']);
            await delay(100);
            await shell.setSize({ rows: 12, columns: 43 });
            await terminalInput(shell, ['b', '\n', keys.EOT]);
            await cmd;
            return output.text;
          },
          [stdinOption, cmdName]
        );
        expect(output).toMatch(
          `${cmdName} onsignal stdin\r\na\r\nA\r\nonsignal: SIGWINCH rows 12 x columns 43\r\nb\r\nB\r\n`
        );
      });

      // The onsignal handler writes the signal name, and the command continues to run.
      [
        {
          description: 'call onPosixSignal callback on Ctrl-C',
          args: 'onsignal stdin',
          inputs: ['a', '\r', '\x03'],
          expected: 'a\r\nA\r\n^Consignal: SIGINT\r\nb\r\nB\r\n'
        },
        {
          description: 'discard partial line on Ctrl-C',
          args: 'onsignal stdin',
          inputs: ['a', '\x03'],
          expected: 'a^Consignal: SIGINT\r\nb\r\nB\r\n'
        },
        {
          description: 'continue to run on Ctrl-C if no onPosixSignal callback',
          args: 'stdin',
          inputs: ['a', '\x03'],
          expected: 'a^Cb\r\nB\r\n'
        }
      ].forEach(({ description, args, inputs, expected }) => {
        test(`should ${description} via ${stdinOption}`, async ({ page, supportsSAB }) => {
          test.skip(stdinOption === 'sab' && !supportsSAB, 'SAB not available');
          const output = await page.evaluate(
            async ({ stdinOption, cmdText, inputs }) => {
              const { externalCommands, keys, shellSetupEmpty, terminalInput } = globalThis.cockle;
              const { shell, output } = await shellSetupEmpty({ externalCommands, stdinOption });
              const cmd = shell.inputLine(cmdText);
              await terminalInput(shell, inputs);
              await terminalInput(shell, ['b', '\r', keys.EOT]);
              await cmd;
              return [await shell.exitCode(), output.text];
            },
            { stdinOption, cmdText: `${cmdName} ${args}`, inputs }
          );
          expect(output).toEqual([0, `${cmdName} ${args}\r\n${expected}/drive$ `]);
        });
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

    test('should write size', async ({ page }) => {
      const output = await page.evaluate(async cmdName => {
        const { externalCommands, shellSetupEmpty } = globalThis.cockle;
        const { shell, output } = await shellSetupEmpty({ externalCommands });
        await shell.inputLine(`${cmdName} size`);
        const ret0 = output.textAndClear();
        shell.setSize({ rows: 10, columns: 20 });
        await shell.inputLine(`${cmdName} size`);
        const ret1 = output.textAndClear();
        shell.setSize({ rows: -1, columns: -5 });
        await shell.inputLine(`${cmdName} size`);
        return [ret0, ret1, output.text];
      }, cmdName);
      expect(output[0]).toMatch('\r\nsize: rows 24 x columns 80\r\n');
      expect(output[1]).toMatch('\r\nsize: rows 10 x columns 20\r\n');
      expect(output[2]).toMatch('\r\nsize: rows 0 x columns 0\r\n');
    });

    test('should call onPosixSignal callback when size changes', async ({ page }) => {
      const output = await page.evaluate(async cmdName => {
        const { delay, externalCommands, shellSetupEmpty } = globalThis.cockle;
        const { shell, output } = await shellSetupEmpty({ externalCommands });
        const cmd = shell.inputLine(`${cmdName} onsignal sleep`);
        await delay(500);
        await shell.setSize({ rows: 12, columns: 43 });
        await cmd;
        return output.text;
      }, cmdName);
      expect(output).toMatch('\r\nonsignal: SIGWINCH rows 12 x columns 43\r\n');
    });

    test('should emit commandStateChanged signals', async ({ page }) => {
      const output = await page.evaluate(async cmdName => {
        const { externalCommands, shellSetupEmpty } = globalThis.cockle;
        const { commandStateChanged, shell } = await shellSetupEmpty({
          externalCommands,
          wantCommandStateChanged: true
        });
        await shell.inputLine(`${cmdName} stdout`);
        return commandStateChanged;
      }, cmdName);
      expect(output).toHaveLength(3);
      expect(output[0]).toEqual({
        commandId: 0,
        name: cmdName,
        args: ['stdout'],
        state: 'loading'
      });
      expect(output[1]).toEqual({ commandId: 0, state: 'running' });
      expect(output[2]).toEqual({ commandId: 0, exitCode: 0, state: 'finished' });
    });
  });
});

describeCoiAndNonCoi('tab complete js-tab command', () => {
  test('should show all positional arguments', async ({ page }) => {
    const output = await page.evaluate(async cmdName => {
      const { externalCommands, shellSetupEmpty, terminalInput } = globalThis.cockle;
      const { shell, output } = await shellSetupEmpty({ externalCommands });
      await terminalInput(shell, ['e', 'x', 't', '\t', 't', 'a', '\t', '\t']);
      return output.text;
    });
    const lines = output.split('\r\n');
    expect(lines[1]).toEqual(
      'color        exitCode     onsignal     size         stderr       stdinchar'
    );
    expect(lines[2]).toEqual(
      'environment  name         shellId      sleep        stdin        stdout'
    );
  });

  test('should match the single possible starting with letter n', async ({ page }) => {
    const output = await page.evaluate(async cmdName => {
      const { externalCommands, shellSetupEmpty, terminalInput } = globalThis.cockle;
      const { shell, output } = await shellSetupEmpty({ externalCommands });
      await terminalInput(shell, ['e', 'x', 't', '\t', 't', 'a', '\t', 'n', '\t']);
      return output.text;
    });
    expect(output).toMatch(/^external-tab name $/);
  });

  test('should complete common start string st', async ({ page }) => {
    const output = await page.evaluate(async cmdName => {
      const { externalCommands, shellSetupEmpty, terminalInput } = globalThis.cockle;
      const { shell, output } = await shellSetupEmpty({ externalCommands });
      await terminalInput(shell, ['e', 'x', 't', '\t', 't', 'a', '\t', 's', 't', '\t']);
      return output.text;
    });
    expect(output).toMatch(/^external-tab std$/);
  });

  test('should show all possible matches starting with std', async ({ page }) => {
    const output = await page.evaluate(async cmdName => {
      const { externalCommands, shellSetupEmpty, terminalInput } = globalThis.cockle;
      const { shell, output } = await shellSetupEmpty({ externalCommands });
      await terminalInput(shell, ['e', 'x', 't', '\t', 't', 'a', '\t', 's', 't', 'd', '\t']);
      return output.text;
    });
    expect(output).toMatch(/^external-tab std\r\nstderr {5}stdin {6}stdinchar {2}stdout\r\n/);
  });

  test('should match two separate possible arguments', async ({ page }) => {
    const output = await page.evaluate(async cmdName => {
      const { externalCommands, shellSetupEmpty, terminalInput } = globalThis.cockle;
      const { shell, output } = await shellSetupEmpty({ externalCommands });
      await terminalInput(shell, ['e', 'x', 't', '\t', 't', 'a', '\t', 'n', '\t', 'e', 'x', '\t']);
      return output.text;
    });
    expect(output).toMatch(/^external-tab name exitCode $/);
  });

  test('should complete last external command name', async ({ page }) => {
    const output = await page.evaluate(async cmdName => {
      const { externalCommands, shellSetupEmpty, terminalInput } = globalThis.cockle;
      const { shell, output } = await shellSetupEmpty({ externalCommands });
      await terminalInput(shell, ['u', 'n', 'a', '\t', ';', 'e', 'x', 't', '\t', 't', 'a', '\t']);
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
        'a',
        '\t',
        'c',
        '\t'
      ]);
      return output.text;
    });
    expect(output).toMatch(/^uname ;external-tab color $/);
  });
});
