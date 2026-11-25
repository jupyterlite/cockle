import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';
import { test } from './utils';

type FlagNames = { set?: string[]; clear?: string[] };
interface IFlagChanges {
  iflag?: FlagNames;
  lflag?: FlagNames;
  oflag?: FlagNames;
}

// Output when check_termios finishes, followed by the next prompt.
const END = 'End of input\r\njs-shell: ';

/**
 * Run check_termios with the specified changes to the default termios flags, type the inputs
 * followed by EOT, and return the terminal output that follows the command line.
 */
async function checkTermios(
  page: Page,
  stdinOption: string,
  changes: IFlagChanges,
  inputs: string[]
): Promise<string> {
  return await page.evaluate(
    async ({ stdinOption, changes, inputs }) => {
      const { keys, shellSetupEmpty, terminalInput, Termios } = globalThis.cockle;
      const { shell, output } = await shellSetupEmpty({ stdinOption });

      const flags: any = new Termios.Termios().get();
      const enums: any = {
        iflag: Termios.InputFlag,
        lflag: Termios.LocalFlag,
        oflag: Termios.OutputFlag
      };
      let cmdText = 'check_termios';
      for (const [name, change] of Object.entries(changes)) {
        let value = flags[`c_${name}`];
        change.set?.forEach(flag => (value |= enums[name][flag]));
        change.clear?.forEach(flag => (value &= ~enums[name][flag]));
        cmdText += ` --${name} ${value}`;
      }

      const cmd = shell.inputLine(cmdText);
      await terminalInput(shell, [...inputs, keys.EOT]);
      await cmd;
      const { text } = output;
      return text.slice(text.indexOf('\r\n') + 2);
    },
    { stdinOption, changes, inputs }
  );
}

const backspace = '\x7F';
const ctrlBackslash = '\x1c';
const ctrlC = '\x03';
const ctrlD = '\x04';
const ctrlJ = '\n';
const ctrlQ = '\x11';
const ctrlS = '\x13';
const ctrlU = '\x15';
const ctrlV = '\x16';
const ctrlW = '\x17';
const ctrlX = '\x18';
const ctrlZ = '\x1a';
const enter = '\r';

interface ILineDisciplineCase {
  name: string;
  changes: IFlagChanges;
  inputs: string[];
  expected: string;
}

const lineDisciplineCases: ILineDisciplineCase[] = [
  {
    name: 'erase previous character on backspace',
    changes: {},
    inputs: ['a', 'b', backspace, 'c', enter],
    expected: 'ab\b \bc\r\nac\r\n' + END
  },
  {
    name: 'erase line on Ctrl-U',
    changes: {},
    inputs: ['a', 'b', ctrlU, 'c', enter],
    expected: 'ab\b \b\b \bc\r\nc\r\n' + END
  },
  {
    name: 'erase word on Ctrl-W',
    changes: {},
    inputs: ['a', ' ', 'b', 'c', ctrlW, 'd', enter],
    expected: 'a bc\b \b\b \bd\r\na d\r\n' + END
  },
  {
    name: 'treat character after Ctrl-V as literal',
    changes: {},
    inputs: [ctrlV, ctrlC, enter],
    expected: '^\b^C\r\n\x03\r\n' + END
  },
  {
    name: 'not echo if not LocalFlag.ECHO',
    changes: { lflag: { clear: ['ECHO'] } },
    inputs: ['a', 'b', enter],
    expected: 'ab\r\n' + END
  },
  {
    name: 'not map CR to NL if not InputFlag.ICRNL',
    changes: { iflag: { clear: ['ICRNL'] } },
    inputs: ['a', enter, ctrlJ],
    expected: 'a^M\r\na\r\r\n' + END
  },
  {
    name: 'map NL to CR if InputFlag.INLCR',
    changes: { iflag: { set: ['INLCR'] } },
    inputs: ['a', ctrlJ, enter],
    expected: 'a^M\r\na\r\r\n' + END
  },
  {
    name: 'map lower case to upper case if OutputFlag.OLCUC',
    changes: { oflag: { set: ['OLCUC'] } },
    inputs: ['a', 'b', enter],
    expected: 'AB\r\nAB\r\nEND OF INPUT\r\njs-shell: '
  },
  {
    name: 'pass Ctrl-C to command if not LocalFlag.ISIG',
    changes: { lflag: { clear: ['ISIG'] } },
    inputs: [ctrlC, enter],
    expected: '^C\r\n\x03\r\n' + END
  },
  {
    name: 'not output CR at column 0 if OutputFlag.ONOCR',
    changes: { iflag: { clear: ['ICRNL'] }, oflag: { set: ['ONOCR'] } },
    inputs: [enter, 'a', ctrlJ],
    expected: '^Ma\r\na\r\n' + END
  },
  {
    name: 'output CR at column 0 if not OutputFlag.ONOCR',
    changes: { iflag: { clear: ['ICRNL'] } },
    inputs: [enter, 'a', ctrlJ],
    expected: '^Ma\r\n\ra\r\n' + END
  },
  {
    name: 'send partial line to command on Ctrl-D',
    changes: {},
    inputs: ['a', 'b', ctrlD],
    expected: 'abab' + END
  }
];

const flagOptions = [{ flag: 'default' }, { flag: 'enabled' }, { flag: 'disabled' }];

test.describe('termios', () => {
  test.describe('check_termios', () => {
    flagOptions.forEach(({ flag }) => {
      test(`should support OutputFlag.ONLCR ${flag}`, async ({ page }) => {
        const output = await page.evaluate(async flag => {
          const { keys, shellSetupEmpty, terminalInput, Termios } = globalThis.cockle;
          const { shell, output } = await shellSetupEmpty();
          const { EOT } = keys;

          let cmdText = 'check_termios';
          if (flag !== 'default') {
            const termios = new Termios.Termios().get();
            const oflag =
              flag === 'enabled'
                ? termios.c_oflag | Termios.OutputFlag.ONLCR
                : termios.c_oflag & ~Termios.OutputFlag.ONLCR;
            cmdText += ` --oflag ${oflag}`;
          }
          const cmd = shell.inputLine(cmdText);

          await terminalInput(shell, ['a', 'b']);
          const ret = [output.textAndClear()];
          await terminalInput(shell, ['c', '\n']);
          ret.push(output.textAndClear());
          await terminalInput(shell, [EOT]);
          ret.push(output.textAndClear());
          await cmd;
          return ret;
        }, flag);

        expect(output[0]).toMatch(/\r\nab$/);
        if (flag !== 'disabled') {
          expect(output[1]).toEqual('c\r\nabc\r\n');
          expect(output[2]).toMatch(/^End of input\r\n/);
        } else {
          expect(output[1]).toEqual('c\nabc\n');
          expect(output[2]).toMatch(/^End of input\n/);
        }
      });
    });
  });

  const stdinOptions = ['sab', 'sw'];
  stdinOptions.forEach(stdinOption => {
    test.describe(`line discipline via ${stdinOption}`, () => {
      lineDisciplineCases.forEach(({ name, changes, inputs, expected }) => {
        test(`should ${name}`, async ({ page, supportsSAB }) => {
          test.skip(stdinOption === 'sab' && !supportsSAB, 'SAB not available');
          const output = await checkTermios(page, stdinOption, changes, inputs);
          expect(output).toBe(expected);
        });
      });

      test('should stop output on Ctrl-S and restart on Ctrl-Q', async ({ page, supportsSAB }) => {
        test.skip(stdinOption === 'sab' && !supportsSAB, 'SAB not available');
        const output = await page.evaluate(
          async ({ stdinOption, stopped, restart }) => {
            const { keys, shellSetupEmpty, terminalInput } = globalThis.cockle;
            const { shell, output } = await shellSetupEmpty({ stdinOption });
            const cmd = shell.inputLine('check_termios');
            await terminalInput(shell, stopped);
            const ret = [output.textAndClear()];
            await terminalInput(shell, restart);
            ret.push(output.textAndClear());
            await terminalInput(shell, [keys.EOT]);
            await cmd;
            return ret;
          },
          { stdinOption, stopped: [ctrlS, 'a', 'b', enter], restart: [ctrlQ] }
        );
        expect(output[0]).toBe('check_termios\r\n');
        expect(output[1]).toBe('ab\r\nab\r\n');
      });

      [
        { cmdText: 'echo -n abc', description: 'after output not ending with a new line' },
        { cmdText: 'echo abc', description: 'but not a blank line after output ending with one' }
      ].forEach(({ cmdText, description }) => {
        test(`should start prompt on a new line ${description}`, async ({ page, supportsSAB }) => {
          test.skip(stdinOption === 'sab' && !supportsSAB, 'SAB not available');
          const output = await page.evaluate(
            async ({ stdinOption, cmdText }) => {
              const { shell, output } = await globalThis.cockle.shellSetupEmpty({ stdinOption });
              await shell.inputLine(cmdText);
              return output.text;
            },
            { stdinOption, cmdText }
          );
          expect(output).toBe(`${cmdText}\r\nabc\r\njs-shell: `);
        });
      });
    });

    test.describe(`signals via ${stdinOption}`, () => {
      [
        { cmdText: 'cat', inputs: ['a', 'b', ctrlC], expected: 'cat\r\nab^C\r\njs-shell: ' },
        { cmdText: 'wc', inputs: ['a', enter, ctrlC], expected: 'wc\r\na\r\n^C\r\njs-shell: ' },
        {
          cmdText: 'grep a',
          inputs: ['b', enter, ctrlC],
          expected: 'grep a\r\nb\r\n^C\r\njs-shell: '
        }
      ].forEach(({ cmdText, inputs, expected }) => {
        test(`should interrupt ${cmdText} on Ctrl-C`, async ({ page, supportsSAB }) => {
          test.skip(stdinOption === 'sab' && !supportsSAB, 'SAB not available');
          const output = await page.evaluate(
            async ({ stdinOption, cmdText, inputs }) => {
              const { shellSetupEmpty, terminalInput } = globalThis.cockle;
              const { shell, output } = await shellSetupEmpty({ stdinOption });
              const cmd = shell.inputLine(cmdText);
              await terminalInput(shell, inputs);
              await cmd;
              return output.text;
            },
            { stdinOption, cmdText, inputs }
          );
          expect(output).toBe(expected);
        });
      });

      [
        { cmdText: 'echo $?', description: 'set exit code', expected: '130' },
        { cmdText: 'echo ok', description: 'run another command', expected: 'ok' }
      ].forEach(({ cmdText, description, expected }) => {
        test(`should ${description} after Ctrl-C`, async ({ page, supportsSAB }) => {
          test.skip(stdinOption === 'sab' && !supportsSAB, 'SAB not available');
          const output = await page.evaluate(
            async ({ stdinOption, cmdText, inputs }) => {
              const { shellSetupEmpty, terminalInput } = globalThis.cockle;
              const { shell, output } = await shellSetupEmpty({ stdinOption });
              const cmd = shell.inputLine('cat');
              await terminalInput(shell, inputs);
              await cmd;
              output.clear();
              await shell.inputLine(cmdText);
              return output.text;
            },
            { stdinOption, cmdText, inputs: ['a', 'b', ctrlC] }
          );
          expect(output).toBe(`${cmdText}\r\n${expected}\r\njs-shell: `);
        });
      });

      // Ctrl-\ and Ctrl-Z do not send signals, they are passed to the command as characters.
      [
        { name: 'Ctrl-\\', key: ctrlBackslash, echo: '^\\' },
        { name: 'Ctrl-Z', key: ctrlZ, echo: '^Z' }
      ].forEach(({ name, key, echo }) => {
        test(`should pass ${name} to cat as a character`, async ({ page, supportsSAB }) => {
          test.skip(stdinOption === 'sab' && !supportsSAB, 'SAB not available');
          const output = await page.evaluate(
            async ({ stdinOption, inputs }) => {
              const { shellSetupEmpty, terminalInput } = globalThis.cockle;
              const { shell, output } = await shellSetupEmpty({ stdinOption });
              const cmd = shell.inputLine('cat');
              await terminalInput(shell, inputs);
              await cmd;
              return [await shell.exitCode(), output.text];
            },
            { stdinOption, inputs: ['a', key, enter, ctrlD] }
          );
          expect(output).toEqual([0, `cat\r\na${echo}\r\na${key}\r\njs-shell: `]);
        });
      });

      // Commands that handle Ctrl-C themselves, either as a character (ISIG not set) or using
      // their own signal handler. If Ctrl-C terminates the command the exit code is 130.
      // Wait for vim to display the file before typing, as Ctrl-C typed before vim has changed the
      // terminal mode sends SIGINT, and vim then discards the input that follows it. The inputs to
      // exit are typed separately so that the command has handled Ctrl-C before it receives them.
      [
        { cmdText: 'less file2', inputs: [ctrlC], exitInputs: ['q'] },
        { cmdText: 'nano', inputs: [ctrlC], exitInputs: [ctrlX] },
        {
          cmdText: 'vim file2',
          readyText: '"file2"',
          inputs: ['i', 'a', ctrlC],
          exitInputs: [':', 'q', '!', enter]
        }
      ].forEach(({ cmdText, readyText, inputs, exitInputs }) => {
        const name = cmdText.split(' ')[0];
        test(`should not terminate ${name} on Ctrl-C`, async ({ page, supportsSAB }) => {
          test.skip(stdinOption === 'sab' && !supportsSAB, 'SAB not available');
          const exitCode = await page.evaluate(
            async ({ stdinOption, cmdText, readyText, inputs, exitInputs }) => {
              const { shellSetupSimple, terminalInput } = globalThis.cockle;
              const { shell, output } = await shellSetupSimple({ color: true, stdinOption });
              const ready = readyText === undefined ? undefined : output.contains(readyText);
              const cmd = shell.inputLine(cmdText);
              await ready;
              await terminalInput(shell, inputs);
              await terminalInput(shell, exitInputs);
              await cmd;
              return await shell.exitCode();
            },
            { stdinOption, cmdText, readyText, inputs, exitInputs }
          );
          expect(exitCode).toBe(0);
        });
      });
    });
  });
});
