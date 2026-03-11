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

  test('should match wildcard', async ({ page }) => {
    const output = await shellLineSimpleN(page, ['ls *', 'ls f*', 'ls file?']);
    expect(output[0]).toMatch('ls *\r\nfile1  file2\r\n\r\ndirA:\r\n');
    expect(output[1]).toMatch('ls f*\r\nfile1  file2\r\n');
    expect(output[2]).toMatch('ls file?\r\nfile1  file2\r\n');
  });

  test('should keep wildcard if no matches', async ({ page }) => {
    const output = await page.evaluate(async () => {
      const { shell, output } = await globalThis.cockle.shellSetupSimple();
      await shell.inputLine('ls z*');
      const ret = [output.textAndClear(), await shell.exitCode()];
      await shell.inputLine('ls f* z*');
      ret.push(output.textAndClear(), await shell.exitCode());
      await shell.inputLine('ls file2 q*');
      ret.push(output.textAndClear(), await shell.exitCode());
      return ret;
    });

    expect(output[0]).toMatch("\r\nls: cannot access 'z*': No such file or directory\r\n");
    expect(output[1]).toBe(2);

    expect(output[2]).toMatch("\r\nls: cannot access 'z*': No such file or directory\r\n");
    expect(output[2]).toMatch(/\r\n\s*file1\s+file2\r\n/);
    expect(output[3]).toBe(2);

    expect(output[4]).toMatch("\r\nls: cannot access 'q*': No such file or directory\r\n");
    expect(output[4]).toMatch(/\r\n\s*file2\r\n/);
    expect(output[5]).toBe(2);
  });
});
