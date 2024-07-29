import { expect } from '@playwright/test';
import { shellRunEmpty, shellRunSimpleN, test } from '../utils';

test.describe('ls command', () => {
  test('should write to stdout', async ({ page }) => {
    const output = await shellRunSimpleN(page, ['ls', 'ls -a']);
    expect(output).toEqual(['dirA  file1  file2\r\n', '.  ..  dirA  file1  file2\r\n']);
  });

  test('should handle empty listing', async ({ page }) => {
    expect(await shellRunEmpty(page, 'ls')).toEqual('');
  });

  test('should vary with COLUMNS', async ({ page }) => {
    const output = await page.evaluate(async () => {
      const { shell, output, FS } = await globalThis.cockle.shell_setup_simple();
      FS.writeFile('a', '');
      FS.writeFile('bb', '');
      FS.writeFile('ccc', '');
      FS.writeFile('dddd', '');
      FS.writeFile('eeeee', '');
      FS.writeFile('ffffff', '');
      FS.writeFile('ggggg', '');
      FS.writeFile('hhhh', '');
      FS.writeFile('iii', '');
      FS.writeFile('jj', '');
      FS.writeFile('k', '');

      await shell.setSize(10, 50);
      await shell._runCommands('ls');
      const ret = [output.text];
      output.clear();

      await shell.setSize(10, 40);
      await shell._runCommands('ls');
      ret.push(output.text);
      output.clear();

      await shell.setSize(10, 20);
      await shell._runCommands('ls');
      ret.push(output.text);
      return ret;
    });
    expect(output[0]).toEqual(
      'a   ccc   dirA	 ffffff  file2	hhhh  jj\r\nb' + 'b  dddd  eeeee  file1	 ggggg	iii   k\r\n'
    );
    expect(output[1]).toEqual(
      'a    dddd   ffffff  ggggg  jj\r\n' +
        'bb   dirA   file1   hhhh   k\r\n' +
        'ccc  eeeee  file2   iii\r\n'
    );
    expect(output[2]).toEqual(
      'a     eeeee   hhhh\r\n' +
        'bb    ffffff  iii\r\n' +
        'ccc   file1   jj\r\n' +
        'dddd  file2   k\r\n' +
        'dirA  ggggg\r\n'
    );
  });
});
