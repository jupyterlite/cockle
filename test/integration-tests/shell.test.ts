import { expect } from '@playwright/test';
import {
  shellInputsSimple,
  shellInputsSimpleN,
  shellLineComplex,
  shellLineComplexN,
  shellLineSimple,
  shellLineSimpleN,
  test
} from './utils';
import { keys } from '../serve/keys';

test.describe('Shell', () => {
  test.describe('run command', () => {
    test('should run ls command', async ({ page }) => {
      expect(await shellLineSimple(page, 'ls')).toMatch(/^ls\r\ndirA {2}file1 {2}file2\r\n/);
    });

    test('should run ls command with leading whitespace', async ({ page }) => {
      expect(await shellLineSimple(page, '   ls')).toMatch(/^ {3}ls\r\ndirA {2}file1 {2}file2\r\n/);
    });

    test('should output redirect to file', async ({ page }) => {
      const output = await shellLineSimpleN(page, [
        'echo Hello > out',
        'cat out',
        'wc out',
        'echo Goodbye >> out',
        'cat out',
        'wc out'
      ]);
      expect(output[1]).toMatch('\r\nHello\r\n');
      expect(output[2]).toMatch('\r\n1 1 6 out\r\n');
      expect(output[4]).toMatch('\r\nHello\r\nGoodbye\r\n');
      expect(output[5]).toMatch('\r\n 2  2 14 out\r\n');
    });

    test('should output redirect to file without ansi escapes', async ({ page }) => {
      // grep to terminal is colored
      const output_direct = await shellLineSimple(page, 'grep of file1', { color: true });
      const start = '\x1B[01;31m\x1B[K'; // TODO: don't use magic strings here
      const end = '\x1B[m\x1B[K';
      expect(output_direct).toMatch(`\r\nContents ${start}of${end} the file\r\n`);

      // grep to file is not colored
      const output_file = await shellLineSimpleN(page, ['grep of file1 > output', 'cat output'], {
        color: false
      });
      expect(output_file[1]).toMatch(/^cat output\r\nContents of the file\r\n/);
    });

    test('should input redirect from file', async ({ page }) => {
      expect(await shellLineSimple(page, 'wc < file2')).toMatch('      1       5      27\r\n');
    });

    test('should support pipe', async ({ page }) => {
      const output = await shellLineSimpleN(page, ['ls -1|sort -r', 'ls -1|sort -r|uniq -c']);
      expect(output[0]).toMatch('\r\nfile2\r\nfile1\r\ndirA\r\n');
      expect(output[1]).toMatch('\r\n      1 file2\r\n      1 file1\r\n      1 dirA\r\n');
    });

    test('should support quotes', async ({ page }) => {
      const output = await shellLineSimple(page, 'echo "Hello    x;   yz"');
      expect(output).toMatch('\r\nHello    x;   yz\r\n');
    });

    test('should set IShell.exitCode', async ({ page }) => {
      const exitCodes = await page.evaluate(async cmdName => {
        const { shell } = await globalThis.cockle.shellSetupSimple();
        await shell.inputLine('ls file1');
        const exitCode0 = await shell.exitCode();
        await shell.inputLine('ls unknown');
        const exitCode1 = await shell.exitCode();
        return [exitCode0, exitCode1];
      });
      expect(exitCodes).toEqual([0, 2]);
    });

    test('should set $? (exit code)', async ({ page }) => {
      const output = await shellLineSimpleN(page, [
        // WASM command success.
        'ls unknown',
        'env|grep ?',
        // WASM command error.
        'ls file2',
        'env|grep ?',
        // Built-in command success.
        'cd unknown',
        'env|grep ?',
        // Built-in command error.
        'cd dirA',
        'env|grep ?',
        // Parse error.
        'ls "blah ',
        'env|grep ?',
        // Command does not exist.
        'abcde',
        'env|grep ?',
        // Multiple commands success.
        'echo Hello; pwd',
        'env|grep ?',
        // Multiple commands failure.
        'cd a b; pwd',
        'env|grep ?',
        // True and false commands
        'true',
        'env|grep ?',
        'false',
        'env|grep ?'
      ]);
      expect(output[1]).toMatch('\r\n?=2\r\n');
      expect(output[3]).toMatch('\r\n?=0\r\n');
      expect(output[5]).toMatch('\r\n?=1\r\n');
      expect(output[7]).toMatch('\r\n?=0\r\n');
      expect(output[9]).toMatch('\r\n?=1\r\n');
      expect(output[11]).toMatch('\r\n?=127\r\n');
      expect(output[12]).toMatch('\r\nHello\r\n/drive/dirA\r\n');
      expect(output[13]).toMatch('\r\n?=0\r\n');
      expect(output[14]).toMatch(/Error: cd: too many arguments/);
      expect(output[15]).toMatch('\r\n?=1\r\n');
      expect(output[17]).toMatch('\r\n?=0\r\n');
      expect(output[19]).toMatch('\r\n?=1\r\n');
    });

    test('should support unicode', async ({ page }) => {
      const output = await shellLineSimple(page, 'echo 🚀');
      expect(output).toMatch(/^echo 🚀\r\n🚀\r\n/);
    });
  });

  test.describe('echo input', () => {
    test('should echo input up to \\r', async ({ page }) => {
      expect(await shellInputsSimple(page, ['l', 's', ' ', '-', 'a', 'l'])).toEqual('ls -al');
    });

    test('should echo input and run ls command after \\r', async ({ page }) => {
      expect(await shellInputsSimple(page, ['l', 's', '\r'])).toMatch(
        /^ls\r\ndirA {2}file1 {2}file2\r\n/
      );
    });
  });

  test.describe('setSize', () => {
    test('should set envVars', async ({ page }) => {
      const output = await page.evaluate(async () => {
        const { output, shell } = await globalThis.cockle.shellSetupEmpty();
        const ret: string[] = [];
        await shell.setSize(10, 44);
        await shell.inputLine('env|grep LINES;env|grep COLUMNS');
        ret.push(output.textAndClear());

        await shell.setSize(0, 45);
        await shell.inputLine('env|grep LINES;env|grep COLUMNS');
        ret.push(output.textAndClear());

        await shell.setSize(14, -1);
        await shell.inputLine('env|grep LINES;env|grep COLUMNS');
        ret.push(output.textAndClear());
        return ret;
      });
      expect(output[0]).toMatch(
        '\r\nLINES=10\r\nLESS_LINES=10\r\nCOLUMNS=44\r\nLESS_COLUMNS=44\r\n'
      );
      expect(output[1]).toMatch('\r\nCOLUMNS=45\r\nLESS_COLUMNS=45\r\n');
      expect(output[2]).toMatch('\r\nLINES=14\r\nLESS_LINES=14\r\n');
    });
  });

  test.describe('command line editing', () => {
    const { backspace, delete_, end, enter, home, leftArrow, next, prev, rightArrow } = keys;

    // We can't explicitly check the cursor position without performing a visual test or decoding
    // the ANSI escape sequences, so here we use an echo command that will write to stdout and
    // insert an easily identified character at the cursor location.
    test('should delete forward and backward', async ({ page }) => {
      const common = ['e', 'c', 'h', 'o', ' ', 'A', 'B', 'C', 'D'];
      const output = await shellInputsSimpleN(page, [
        [...common, leftArrow, leftArrow, backspace, enter],
        [...common, leftArrow, leftArrow, delete_, enter]
      ]);
      expect(output[0]).toMatch(/\r\nACD\r\n/);
      expect(output[1]).toMatch(/\r\nABD\r\n/);
    });

    test('should support home and end', async ({ page }) => {
      const common = ['c', 'h', 'o', ' ', 'A', 'B', 'C'];
      const output = await shellInputsSimpleN(page, [
        [...common, leftArrow, leftArrow, home, 'e', enter],
        ['e', ...common, leftArrow, leftArrow, end, 'D', enter]
      ]);
      expect(output[0]).toMatch(/\r\nABC\r\n/);
      expect(output[1]).toMatch(/\r\nABCD\r\n/);
    });

    test('should support prev word', async ({ page }) => {
      const common = ['e', 'c', 'h', 'o', ' ', 'A', 'B', ' ', ' ', 'C', 'D'];
      const output = await shellInputsSimpleN(page, [
        [...common, prev, 'Z', enter],
        [...common, prev, prev, 'Y', enter]
      ]);
      expect(output[0]).toMatch(/\r\nAB ZCD\r\n/);
      expect(output[1]).toMatch(/\r\nYAB CD\r\n/);
    });

    test('should support next word', async ({ page }) => {
      const common = ['e', 'c', 'h', 'o', ' ', 'A', 'B', ' ', ' ', 'C', 'D'];
      const output = await shellInputsSimpleN(page, [
        [...common, home, next, next, 'Z', enter],
        [...common, home, next, next, next, 'Y', enter]
      ]);
      expect(output[0]).toMatch(/\r\nABZ CD\r\n/);
      expect(output[1]).toMatch(/\r\nAB CDY\r\n/);
    });

    test('should support paste of multiple characters at a time', async ({ page }) => {
      const output = await shellInputsSimpleN(page, [
        ['echo abcdef', enter],
        ['echo abcdef', leftArrow, leftArrow, leftArrow, 'Z', enter],
        ['echo abcdef', leftArrow, rightArrow, rightArrow, rightArrow, 'Z', enter],
        ['xyz', leftArrow, leftArrow, leftArrow, leftArrow, 'echo ', enter],
        ['xyz', leftArrow, leftArrow, leftArrow, leftArrow, leftArrow, leftArrow, 'echo ', enter]
      ]);
      expect(output[0]).toMatch(/\r\nabcdef\r\n/);
      expect(output[1]).toMatch(/\r\nabcZdef\r\n/);
      expect(output[2]).toMatch(/\r\nabcdefZ\r\n/);
      expect(output[3]).toMatch(/\r\nxyz\r\n/);
      expect(output[4]).toMatch(/\r\nxyz\r\n/);
    });
  });

  test.describe('dispose', () => {
    test('should set isDisposed', async ({ page }) => {
      const output = await page.evaluate(async () => {
        const { shell } = await globalThis.cockle.shellSetupEmpty();
        const isDisposed0 = shell.isDisposed;
        shell.dispose();
        const isDisposed1 = shell.isDisposed;
        return { isDisposed0, isDisposed1 };
      });
      expect(output['isDisposed0']).toBeFalsy();
      expect(output['isDisposed1']).toBeTruthy();
    });

    test('should emit signal', async ({ page }) => {
      const output = await page.evaluate(async () => {
        const { shell } = await globalThis.cockle.shellSetupEmpty();
        let signalled = false;
        shell.disposed.connect(() => {
          signalled = true;
        });
        const isDisposed0 = shell.isDisposed;
        shell.dispose();
        const isDisposed1 = shell.isDisposed;
        return { isDisposed0, isDisposed1, signalled };
      });
      expect(output['isDisposed0']).toBeFalsy();
      expect(output['isDisposed1']).toBeTruthy();
      expect(output['signalled']).toBeTruthy();
    });
  });

  test.describe('filename expansion', () => {
    test('should expand * in pwd', async ({ page }) => {
      const output0 = await shellLineComplex(page, 'ls file*');
      expect(output0).toMatch('\r\nfile1.txt  file2.txt\r\n');

      const output1 = await shellLineComplex(page, 'ls *file');
      expect(output1).toMatch('\r\notherfile\r\n');

      const output2 = await shellLineComplex(page, 'ls *file*');
      expect(output2).toMatch('\r\nfile1.txt  file2.txt  otherfile\r\n');
    });

    test('should include directory contents in match', async ({ page }) => {
      const output = await shellLineComplex(page, 'ls *');
      expect(output).toMatch(
        '\r\nfile1.txt  file2.txt  otherfile\r\n\r\ndir:\r\nsubdir	subfile.md  subfile.txt\r\n'
      );
    });

    test('should expand ? in pwd', async ({ page }) => {
      const output0 = await shellLineComplex(page, 'ls file?.txt');
      expect(output0).toMatch('\r\nfile1.txt  file2.txt\r\n');

      const output1 = await shellLineComplex(page, 'ls file2?txt');
      expect(output1).toMatch('\r\nfile2.txt\r\n');
    });

    test('should use original pattern if no matches', async ({ page }) => {
      const output0 = await shellLineComplex(page, 'ls z*');
      expect(output0).toMatch("ls: cannot access 'z*': No such file or directory");

      const output1 = await shellLineComplex(page, 'ls z?');
      expect(output1).toMatch("ls: cannot access 'z?': No such file or directory");
    });

    test('should match special characters', async ({ page }) => {
      const output = await shellLineComplexN(page, ['touch ab+c', 'ls a*', 'ls *+c']);
      expect(output[1]).toMatch('\r\nab+c\r\n');
      expect(output[2]).toMatch('\r\nab+c\r\n');
    });

    test('should expand * in subdirectory', async ({ page }) => {
      const output0 = await shellLineComplex(page, 'ls dir/subf*');
      expect(output0).toMatch(/\r\ndir\/subfile\.md\s+dir\/subfile\.txt\r\n/);
    });
  });

  test.describe('synchronous stdin settings', () => {
    test('should only report SAB if not using shell manager', async ({ page }) => {
      const output = await shellLineSimple(page, 'cockle-config stdin');
      expect(output).toMatch(
        '│ shared array buffer │ sab        │ yes       │ yes     │\r\n' +
          '│ service worker      │ sw         │           │         │'
      );
    });

    test('should report SAB and SW if using shell manager', async ({ page }) => {
      const output = await page.evaluate(async () => {
        const { shellManager, shellSetupEmpty } = globalThis.cockle;
        const { output, shell } = await shellSetupEmpty({ shellManager });
        await shell.inputLine('cockle-config stdin');
        return output.text;
      });
      expect(output).toMatch(
        '│ shared array buffer │ sab        │ yes       │ yes     │\r\n' +
          '│ service worker      │ sw         │ yes       │         │'
      );
    });

    test('should support setting use of SW via cockle-config', async ({ page }) => {
      const output = await page.evaluate(async () => {
        const { shellManager, shellSetupEmpty } = globalThis.cockle;
        const { output, shell } = await shellSetupEmpty({ shellManager });
        await shell.inputLine('cockle-config stdin sw');
        return output.text;
      });
      expect(output).toMatch(
        '│ shared array buffer │ sab        │ yes       │         │\r\n' +
          '│ service worker      │ sw         │ yes       │ yes     │'
      );
    });
  });

  test.describe('synchronous stdin', () => {
    const stdinOptions = ['sab', 'sw'];
    stdinOptions.forEach(stdinOption => {
      test(`check parameterised stdinOption works for ${stdinOption}`, async ({ page }) => {
        const output = await shellLineSimple(page, 'cockle-config stdin', { stdinOption });
        if (stdinOption === 'sab') {
          expect(output).toMatch(
            '│ shared array buffer │ sab        │ yes       │ yes     │\r\n' +
              '│ service worker      │ sw         │ yes       │         │'
          );
        } else {
          expect(output).toMatch(
            '│ shared array buffer │ sab        │ yes       │         │\r\n' +
              '│ service worker      │ sw         │ yes       │ yes     │'
          );
        }
      });

      test(`should support terminal stdin via ${stdinOption}`, async ({ page }) => {
        const output = await page.evaluate(async stdinOption => {
          const { shell, output } = await globalThis.cockle.shellSetupEmpty({ stdinOption });
          const { keys } = globalThis.cockle;
          const { enter, EOT } = keys;
          await Promise.all([
            shell.inputLine('wc'),
            globalThis.cockle.terminalInput(shell, ['a', ' ', 'b', enter, 'c', EOT])
          ]);
          return output.text;
        });
        expect(output).toMatch(/^wc\r\na b\r\nc {6}1 {7}3 {7}5\r\n/);
      });

      test(`should support terminal stdin via ${stdinOption} of an ansi escape sequence`, async ({
        page
      }) => {
        const output = await page.evaluate(async stdinOption => {
          const { shell, output } = await globalThis.cockle.shellSetupEmpty({ stdinOption });
          const { keys } = globalThis.cockle;
          const { downArrow, EOT } = keys;
          await Promise.all([
            shell.inputLine('wc'),
            globalThis.cockle.terminalInput(shell, ['a', downArrow, 'b', EOT])
          ]);
          return output.text;
        });
        expect(output).toMatch('wc\r\na\x1B[Bb      0       1       5\r\n');
      });

      test(`should support terminal stdin via ${stdinOption} more than once`, async ({ page }) => {
        const output = await page.evaluate(async stdinOption => {
          const { shell, output } = await globalThis.cockle.shellSetupEmpty({ stdinOption });
          const { keys } = globalThis.cockle;
          const { enter, EOT } = keys;
          await Promise.all([
            shell.inputLine('wc'),
            globalThis.cockle.terminalInput(shell, ['a', ' ', 'b', enter, 'c', EOT])
          ]);
          const ret0 = output.textAndClear();

          await Promise.all([
            shell.inputLine('wc'),
            globalThis.cockle.terminalInput(shell, ['d', 'e', ' ', 'f', EOT])
          ]);
          const ret1 = output.text;
          return [ret0, ret1];
        });
        expect(output[0]).toMatch(/^wc\r\na b\r\nc {6}1 {7}3 {7}5\r\n/);
        expect(output[1]).toMatch(/^wc\r\nde f {6}0 {7}2 {7}4\r\n/);
      });

      test(`should support terminal stdin with poll timeout via ${stdinOption}`, async ({
        page
      }) => {
        // Test WorkerIO.poll(timeoutMs) using vim which uses a 4 second timeout.
        const output = await page.evaluate(async stdinOption => {
          const { delay, keys, shellSetupEmpty, terminalInput } = globalThis.cockle;
          const { shell, output } = await shellSetupEmpty({
            color: true,
            stdinOption
          });
          const stdinWithDelay = async () => {
            await terminalInput(shell, ['i', 'a', 'b', 'c']);
            await delay(4500); // Delay > 4 seconds to force timeout on poll() call.
            await terminalInput(shell, [
              'Z',
              'z',
              keys.escape,
              ':',
              'w',
              'q',
              ' ',
              'o',
              'u',
              't',
              '\r'
            ]);
          };
          await Promise.all([shell.inputLine('vim'), stdinWithDelay()]);
          output.clear();
          await shell.inputLine('cat out');
          return output.text;
        });
        expect(output).toMatch(/^cat out\r\nabcZz\r\n/);
      });
    });
  });

  test.describe('constructor options', () => {
    test('should support setting aliases', async ({ page }) => {
      const output = await page.evaluate(async () => {
        const aliases = { my_alias: 'target --something' };
        const { output, shell } = await globalThis.cockle.shellSetupEmpty({ aliases });
        await shell.inputLine('alias my_alias');
        return output.text;
      });
      expect(output).toMatch(/^alias my_alias\r\nmy_alias='target --something'\r\n/);
    });

    test('should support setting environment variables', async ({ page }) => {
      const output = await page.evaluate(async () => {
        const environment = { ABC: 'some_value' };
        const { output, shell } = await globalThis.cockle.shellSetupEmpty({ environment });
        await shell.inputLine('env | grep ABC');
        return output.text;
      });
      expect(output).toMatch(/^env | grep ABC'\r\nABC=some_value\r\n/);
    });

    test('should support deleting environment variables', async ({ page }) => {
      const exitCode = await page.evaluate(async () => {
        const environment = { PS1: null };
        const { shell } = await globalThis.cockle.shellSetupEmpty({ environment });
        await shell.inputLine('env | grep PS1');
        return await shell.exitCode();
      });
      expect(exitCode).toEqual(1);
    });
  });

  test.describe('themeChange', () => {
    const modes = ['dark', 'light'];
    modes.forEach(mode => {
      test(`should support known ${mode} mode`, async ({ page }) => {
        const output = await page.evaluate(async mode => {
          const { delay, shellSetupEmpty } = globalThis.cockle;
          const { output, shell } = await shellSetupEmpty({ color: true });
          const isDarkMode = mode === 'dark';
          shell.themeChange(isDarkMode);
          await delay(10);
          await shell.inputLine('');
          await delay(10);
          const ret0 = output.textAndClear();
          await shell.inputLine('env|grep DARK_MODE --color=never');
          return [ret0, output.text];
        }, mode);
        // Note: shell cannot handle determining the terminal background color unless it is
        // connected to a real terminal (e.g. xtermjs) or the required ansi sequence is mocked.
        // Here only testing mode being known dark or light.
        const lines = output[0].split('\r\n');
        const promptLine = lines[1];
        // Extract color from the start of the prompt.
        // These checks will change if the prompt color is changed.
        if (mode === 'dark') {
          expect(promptLine.slice(0, 7)).toEqual('\x1B[1;32m'); // Bold green
        } else if (mode === 'light') {
          expect(promptLine.slice(0, 7)).toEqual('\x1B[0;32m'); // Green
        } else {
          throw Error('Unexpected dark/light mode value');
        }

        expect(output[1]).toMatch(mode === 'dark' ? 'COCKLE_DARK_MODE=1' : 'COCKLE_DARK_MODE=0')
      });
    });
  });
});
