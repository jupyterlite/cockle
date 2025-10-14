import { expect } from '@playwright/test';
import { shellInputsSimple, test } from './utils';

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
            const termios = (new Termios.Termios).get();
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

    [{ want: false }, { want: true }].forEach(({ want }) => {
      test(`should support OutputFlag.ONOCR ${want}`, async ({ page }) => {
        const output = await page.evaluate(async want => {
          const { keys, shellSetupEmpty, terminalInput, Termios } = globalThis.cockle;
          const { shell, output } = await shellSetupEmpty();
          const { EOT } = keys;

          let cmdText = 'check_termios';
          let oflag = (new Termios.Termios).get().c_oflag;
          if (want) {
            oflag |= Termios.OutputFlag.ONOCR;
          } else {
            oflag &= ~Termios.OutputFlag.ONOCR;
          }
          cmdText += ` --oflag ${oflag}`;
          const cmd = shell.inputLine(cmdText);

          await terminalInput(shell, ['a', '\n', '\n']);
          const ret = output.textAndClear();
          await terminalInput(shell, [EOT]);

          await cmd;
          return ret;
        }, want);

        if (want) {
          // Note only a single \n after the 'a', others in output column 0 are suppressed.
          expect(output).toEqual('check_termios --oflag 21\r\na\r\na\r\n')
        } else {
          expect(output).toEqual('check_termios --oflag 5\r\na\r\na\r\n\r\n\r\n')
        }
      });
    });
  });
});
