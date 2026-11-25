import { expect } from '@playwright/test';
import { shellLineSimple, shellLineSimpleN, test } from '../utils';

test.describe('wasm-test', () => {
  test('should register', async ({ page }) => {
    const output = await page.evaluate(async () => {
      const { shell, output } = await globalThis.cockle.shellSetupEmpty();
      await shell.inputLine('cockle-config command wasm-test');
      return output.text;
    });
    expect(output).toMatch('│ wasm-test │ wasm-test │');
  });

  test('should write to stdout', async ({ page }) => {
    const output = await page.evaluate(async () => {
      const { shell, output } = await globalThis.cockle.shellSetupEmpty();
      await shell.inputLine('wasm-test stdout');
      return output.text;
    });
    expect(output).toMatch('\r\nOutput line 1\r\nOutput line 2\r\n');
  });

  test('should write to file', async ({ page }) => {
    const output = await page.evaluate(async () => {
      const { shell, output } = await globalThis.cockle.shellSetupEmpty();
      await shell.inputLine('wasm-test stdout > out.txt');
      const out0 = output.textAndClear();
      await shell.inputLine('cat out.txt');
      return [out0, output.text];
    });
    expect(output[0]).not.toMatch('Output line');
    expect(output[1]).toMatch('cat out.txt\r\nOutput line 1\r\nOutput line 2\r\n');
  });

  test('should write to stderr', async ({ page }) => {
    const output = await page.evaluate(async () => {
      const { shell, output } = await globalThis.cockle.shellSetupEmpty();
      await shell.inputLine('wasm-test stderr > out.txt');
      return output.text;
    });
    expect(output).toMatch('Error message\r\n');
  });

  test('should write to named file', async ({ page }) => {
    const output = await page.evaluate(async () => {
      const { shell, output } = await globalThis.cockle.shellSetupEmpty();
      await shell.inputLine('wasm-test writefile');
      output.clear();
      await shell.inputLine('cat writefile.txt');
      return output.text;
    });
    expect(output).toMatch('\r\nFile written by wasm-test\r\n');
  });

  test('should read from named file', async ({ page }) => {
    const output = await page.evaluate(async () => {
      const { shell, output } = await globalThis.cockle.shellSetupEmpty();
      await shell.inputLine('wasm-test readfile'); // Fails, no such file.
      const ret0 = output.textAndClear();
      await shell.inputLine('echo abcdefghij0123456789 > readfile.txt');
      output.clear();
      await shell.inputLine('wasm-test readfile'); // Succeeds and echoes to stdout.
      return [ret0, output.text];
    });
    expect(output[0]).toMatch('\r\nUnable to open file readfile.txt for reading\r\n');
    expect(output[1]).toMatch('\r\nabcdefghij0123456789\r\n');
  });

  test('should return exit code', async ({ page }) => {
    const exitCodes = await page.evaluate(async () => {
      const { shell } = await globalThis.cockle.shellSetupEmpty();
      await shell.inputLine('wasm-test');
      const exitCode0 = await shell.exitCode();
      await shell.inputLine('wasm-test exitCode');
      const exitCode1 = await shell.exitCode();
      return [exitCode0, exitCode1];
    });
    expect(exitCodes).toEqual([0, 1]);
  });

  test('should be passed command name', async ({ page }) => {
    const output = await page.evaluate(async () => {
      const { shell, output } = await globalThis.cockle.shellSetupEmpty();
      await shell.inputLine('wasm-test name');
      return output.text;
    });
    expect(output).toMatch('\r\nwasm-test\r\n');
  });

  test('should read from pipe', async ({ page }) => {
    const output = await page.evaluate(async () => {
      const { shell, output } = await globalThis.cockle.shellSetupSimple();
      await shell.inputLine('cat file2 | wasm-test stdin');
      return output.text;
    });
    expect(output).toMatch(/^cat file2 \| wasm-test stdin\r\nSOME OTHER FILE\r\nSECOND LINE\r\n/);
  });

  test('should read from file', async ({ page }) => {
    const output = await page.evaluate(async () => {
      const { shell, output } = await globalThis.cockle.shellSetupSimple();
      await shell.inputLine('wasm-test stdin < file2');
      return output.text;
    });
    expect(output).toMatch(/^wasm-test stdin < file2\r\nSOME OTHER FILE\r\nSECOND LINE\r\n/);
  });

  const stdinOptions = ['sab', 'sw'];
  stdinOptions.forEach(stdinOption => {
    test(`should read from stdin via ${stdinOption} line buffered`, async ({
      page,
      supportsSAB
    }) => {
      test.skip(stdinOption === 'sab' && !supportsSAB, 'SAB not available');
      const output = await page.evaluate(async stdinOption => {
        const { keys, shellSetupEmpty, terminalInput } = globalThis.cockle;
        const { shell, output } = await shellSetupEmpty({ stdinOption });
        const cmd = shell.inputLine('wasm-test stdin');
        await terminalInput(shell, ['a', 'B', ' ', 'c', '\n', keys.EOT]);
        await cmd;
        return output.text;
      }, stdinOption);
      expect(output).toMatch(/^wasm-test stdin\r\naB c\r\nAB C\r\n/);
    });

    test(`should read from stdin via ${stdinOption} line buffered with backspace`, async ({
      page,
      supportsSAB
    }) => {
      test.skip(stdinOption === 'sab' && !supportsSAB, 'SAB not available');
      const output = await page.evaluate(async stdinOption => {
        const { keys, shellSetupEmpty, terminalInput } = globalThis.cockle;
        const { shell, output } = await shellSetupEmpty({ stdinOption });
        const cmd = shell.inputLine('wasm-test stdin');
        await terminalInput(shell, ['a', 'B', keys.backspace, 'c', '\n', keys.EOT]);
        await cmd;
        return output.text;
      }, stdinOption);
      // Only check the output line.
      const lines = output.split('\r\n');
      expect(lines).toHaveLength(4);
      expect(lines[2]).toBe('AC');
    });

    test(`should read from stdin via ${stdinOption} line buffered with backspaces`, async ({
      page,
      supportsSAB
    }) => {
      test.skip(stdinOption === 'sab' && !supportsSAB, 'SAB not available');
      const output = await page.evaluate(async stdinOption => {
        const { keys, shellSetupEmpty, terminalInput } = globalThis.cockle;
        const { backspace, EOT } = keys;
        const { shell, output } = await shellSetupEmpty({ stdinOption });
        const cmd = shell.inputLine('wasm-test stdin');
        await terminalInput(shell, ['a', backspace, backspace, 'c', '\n', EOT]);
        await cmd;
        return output.text;
      }, stdinOption);
      // Only check the output line.
      const lines = output.split('\r\n');
      expect(lines).toHaveLength(4);
      expect(lines[2]).toBe('C');
    });

    test(`should read from stdin via ${stdinOption} char buffered`, async ({
      page,
      supportsSAB
    }) => {
      test.skip(stdinOption === 'sab' && !supportsSAB, 'SAB not available');
      const output = await page.evaluate(async stdinOption => {
        const { keys, shellSetupEmpty, terminalInput, terminalInputUpperCaseReply } =
          globalThis.cockle;
        const { shell, output } = await shellSetupEmpty({ stdinOption });
        const cmd = shell.inputLine('wasm-test stdinchar');
        await terminalInputUpperCaseReply(shell, output, ['a', 'B', ' ', 'c']);
        await terminalInput(shell, [keys.EOT], 0);
        await cmd;
        return output.text;
      }, stdinOption);
      expect(output).toMatch(/^wasm-test stdinchar\r\naABB {2}cC\^D\r\n/);
    });

    test(`should read unicode from stdin via ${stdinOption}`, async ({ page, supportsSAB }) => {
      test.skip(stdinOption === 'sab' && !supportsSAB, 'SAB not available');
      const output = await page.evaluate(async stdinOption => {
        const { keys, shellSetupEmpty, terminalInput, terminalInputUpperCaseReply } =
          globalThis.cockle;
        const { shell, output } = await shellSetupEmpty({ stdinOption });
        const cmd = shell.inputLine('wasm-test stdinchar');
        await terminalInputUpperCaseReply(shell, output, ['a', 'B', '🎉', 'c']);
        await terminalInput(shell, [keys.EOT], 0);
        await cmd;
        return output.text;
      }, stdinOption);
      expect(output).toMatch(/^wasm-test stdinchar\r\naABB🎉🎉cC\^D\r\n/);
    });

    test(`should read a burst of characters from stdin via ${stdinOption}`, async ({
      page,
      supportsSAB
    }) => {
      test.skip(stdinOption === 'sab' && !supportsSAB, 'SAB not available');
      const letters = 'abcdefghijklmnopqrstuvwxyz'.repeat(16);
      const output = await page.evaluate(
        async ({ stdinOption, letters }) => {
          const { keys, shellSetupEmpty, terminalInput, terminalInputUpperCaseReply } =
            globalThis.cockle;
          const { shell, output } = await shellSetupEmpty({ stdinOption });
          const cmd = shell.inputLine('wasm-test stdinchar');
          // Wait for a reply so that the command is reading a character at a time.
          await terminalInputUpperCaseReply(shell, output, ['1']);
          for (const letter of letters) {
            shell.input(letter); // Not awaited, so that the letters are queued.
          }
          await terminalInput(shell, [keys.EOT], 0);
          await cmd;
          return output.text;
        },
        { stdinOption, letters }
      );
      // The command replies to each letter with its upper case equivalent.
      const replies = output.replace('^D', '').replace(/[^A-Z]/g, '');
      expect(replies).toBe(letters.toUpperCase());
    });

    test(`should call SIGWINCH handler when size changes whilst reading from stdin via ${stdinOption}`, async ({
      page,
      supportsSAB
    }) => {
      test.skip(stdinOption === 'sab' && !supportsSAB, 'SAB not available');
      const output = await page.evaluate(async stdinOption => {
        const { delay, keys, shellSetupEmpty, terminalInput } = globalThis.cockle;
        const { shell, output } = await shellSetupEmpty({ stdinOption });
        const cmd = shell.inputLine('wasm-test onsignal stdin');
        await terminalInput(shell, ['a', '\n']);
        await delay(100);
        // Do not await setSize as it does not resolve until wasm-test exits, as the worker is
        // blocked.
        shell.setSize({ rows: 12, columns: 43 });
        await terminalInput(shell, ['b', '\n', keys.EOT]);
        await cmd;
        return output.text;
      }, stdinOption);
      expect(output).toMatch(
        /^wasm-test onsignal stdin\r\na\r\nA\r\nonsignal: SIGWINCH rows 12 x columns 43\r\nb\r\nB\r\n/
      );
    });
  });

  test('should write color to stdout', async ({ page }) => {
    const output = await page.evaluate(async () => {
      const { shell, output } = await globalThis.cockle.shellSetupSimple();
      await shell.inputLine('wasm-test color');
      return output.text;
    });
    const lines = output.split('\r\n');
    // eslint-disable-next-line no-control-regex
    expect(lines[1]).toMatch(/^\x1b\[38;2;255;128;255mA\x1b\[1;0m/);
  });

  test('should not write color to file', async ({ page }) => {
    const output = await page.evaluate(async () => {
      const { shell, output } = await globalThis.cockle.shellSetupSimple();
      await shell.inputLine('wasm-test color > out');
      output.clear();
      await shell.inputLine('cat out');
      return output.text;
    });
    const lines = output.split('\r\n');
    expect(lines[1]).toMatch(/^ABCDEFGHIJKLMNOPQRSTUVWXYZ/);
  });

  test('should write emscripten version', async ({ page }) => {
    const output = await page.evaluate(async () => {
      const { shell, output } = await globalThis.cockle.shellSetupEmpty();
      await shell.inputLine('wasm-test emscripten');
      return output.text;
    });
    expect(output).toMatch('\r\nEmscripten version: 6.0.8\r\n');
  });

  test('should correctly identify isatty', async ({ page }) => {
    const output0 = await shellLineSimple(page, 'wasm-test isatty');
    expect(output0).toMatch('\r\nisatty stdin 1\r\n');
    expect(output0).toMatch('\r\nisatty stdout 1\r\n');
    expect(output0).toMatch('\r\nisatty stderr 1\r\n');

    const output1 = await shellLineSimple(page, 'wasm-test isatty < file1');
    expect(output1).toMatch('\r\nisatty stdin 0\r\n');
    expect(output1).toMatch('\r\nisatty stdout 1\r\n');
    expect(output1).toMatch('\r\nisatty stderr 1\r\n');

    const output2 = await shellLineSimple(page, 'cat file1 | wasm-test isatty');
    expect(output2).toMatch('\r\nisatty stdin 0\r\n');
    expect(output2).toMatch('\r\nisatty stdout 1\r\n');
    expect(output2).toMatch('\r\nisatty stderr 1\r\n');

    const output3 = await shellLineSimpleN(page, ['wasm-test isatty > out', 'cat out']);
    expect(output3[1]).toMatch('\r\nisatty stdin 1\r\n');
    expect(output3[1]).toMatch('\r\nisatty stdout 0\r\n');
    expect(output3[1]).toMatch('\r\nisatty stderr 1\r\n');

    const output4 = await shellLineSimple(page, 'wasm-test isatty | cat');
    expect(output4).toMatch('\r\nisatty stdin 1\r\n');
    expect(output4).toMatch('\r\nisatty stdout 0\r\n');
    expect(output4).toMatch('\r\nisatty stderr 1\r\n');

    const output5 = await shellLineSimple(page, 'wasm-test isatty 2> err');
    expect(output5).toMatch('\r\nisatty stdin 1\r\n');
    expect(output5).toMatch('\r\nisatty stdout 1\r\n');
    expect(output5).toMatch('\r\nisatty stderr 0\r\n');
  });
});
