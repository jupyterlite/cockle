import { expect } from '@playwright/test';
import { shellLineSimpleN, test } from '../utils';

test.describe('ls command', () => {
  test('should write to stdout', async ({ page }) => {
    const output = await shellLineSimpleN(page, ['ls', 'ls -a']);
    expect(output[0]).toMatch('\r\ndirA  file1  file2\r\n');
    expect(output[1]).toMatch('\r\n.  ..  dirA  file1  file2\r\n');
  });

  test('should vary with COLUMNS', async ({ page }) => {
    const output = await page.evaluate(async () => {
      const options = {
        initialFiles: {
          a: '',
          bb: '',
          ccc: '',
          dddd: '',
          eeeee: '',
          ffffff: '',
          ggggg: '',
          hhhh: '',
          iii: '',
          jj: '',
          k: ''
        }
      };
      const { shell, output } = await globalThis.cockle.shellSetupSimple(options);
      await shell.setSize(10, 50);
      await shell.inputLine('ls');
      const ret = [output.textAndClear()];

      await shell.setSize(10, 40);
      await shell.inputLine('ls');
      ret.push(output.textAndClear());

      await shell.setSize(10, 20);
      await shell.inputLine('ls');
      ret.push(output.textAndClear());
      return ret;
    });
    expect(output[0]).toMatch(
      '\r\na   ccc   dirA	 ffffff  file2	hhhh  jj\r\nbb  dddd  eeeee  file1	 ggggg	iii   k\r\n'
    );
    expect(output[1]).toMatch(
      '\r\na    dddd   ffffff  ggggg  jj\r\n' +
        'bb   dirA   file1   hhhh   k\r\n' +
        'ccc  eeeee  file2   iii\r\n'
    );
    expect(output[2]).toMatch(
      '\r\na     eeeee   hhhh\r\n' +
        'bb    ffffff  iii\r\n' +
        'ccc   file1   jj\r\n' +
        'dddd  file2   k\r\n' +
        'dirA  ggggg\r\n'
    );
  });
});
