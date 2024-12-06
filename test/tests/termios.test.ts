import { expect } from '@playwright/test';
import { test } from './utils';

const flagOptions = [{ flag: 'default' }, { flag: 'enabled' }, { flag: 'disabled' }];

test.describe('termios', () => {
  test.describe('check_termios', () => {
    flagOptions.forEach(({ flag }) => {
      test(`should support OutputFlag.ONLCR ${flag}`, async ({ page }) => {
        const output = await page.evaluate(async flag => {
          const EOT = '\x04';
          const { shell, output } = await globalThis.cockle.shellSetupEmpty();

          let cmdText = 'check_termios';
          if (flag !== 'default') {
            const { OutputFlag, Termios } = globalThis.cockle;
            const termios = Termios.newDefaultWasm();
            const oflag =
              flag === 'enabled'
                ? termios.c_oflag | OutputFlag.ONLCR
                : termios.c_oflag & ~OutputFlag.ONLCR;
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
          ret.push(output.textAndClear());
          return ret;
        }, flag);

        expect(output[1]).toEqual('ab');
        if (flag !== 'disabled') {
          expect(output[2]).toEqual('c\r\n');
          expect(output[3]).toMatch(/^abc\r\nEnd of input\r\n/);
        } else {
          expect(output[2]).toEqual('c\n');
          expect(output[3]).toMatch(/^abc\nEnd of input\n/);
        }
      });
    });
  });
});
