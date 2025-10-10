import { expect } from '@playwright/test';
import { test } from './utils';

const flagOptions = [{ flag: 'default' }, { flag: 'enabled' }, { flag: 'disabled' }];

test.describe('termios', () => {
  test.describe('check_termios', () => {
    flagOptions.forEach(({ flag }) => {
      test(`should support OutputFlag.ONLCR ${flag}`, async ({ page }) => {
        const output = await page.evaluate(async flag => {
          const { shell, output } = await globalThis.cockle.shellSetupEmpty();
          const { keys } = globalThis.cockle;
          const { EOT } = keys;

          let cmdText = 'check_termios';
          if (flag !== 'default') {
            const { Termios } = globalThis.cockle;
            const termios = new Termios.Flags();
            const oflag =
              flag === 'enabled'
                ? termios.c_oflag | Termios.OutputFlag.ONLCR
                : termios.c_oflag & ~Termios.OutputFlag.ONLCR;
            cmdText += ` --oflag ${oflag}`;
          }
          const cmd = shell.inputLine(cmdText);

          await globalThis.cockle.terminalInput(shell, ['a', 'b']);
          const ret = [output.textAndClear()];
          await globalThis.cockle.terminalInput(shell, ['c', '\n']);
          ret.push(output.textAndClear());
          await globalThis.cockle.terminalInput(shell, [EOT]);
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
});
