import { expect } from '@playwright/test';
import { shellLineSimple, shellLineSimpleN, test } from './utils';

// Directories that do and do not persist between wasm commands.
const DIRECTORIES_THAT_PERSIST = ['/drive', '/home', '/include', '/lib', '/share', '/tmp'];
const DIRECTORIES_THAT_DONT_PERSIST = ['/dev', '/proc'];

test.describe('Shared filesystem', () => {
  test.describe('file persistence', () => {
    DIRECTORIES_THAT_PERSIST.forEach(dir => {
      test(`should persist file in ${dir}`, async ({ page }) => {
        const filename = 'abc.txt';
        const output = await shellLineSimpleN(page, [
          `cat ${dir}/${filename}`,
          `echo Hello > ${dir}/${filename}`,
          `cat ${dir}/${filename}`
        ]);
        expect(output[0]).toMatch(`\r\ncat: ${dir}/${filename}: No such file or directory\r\n`);
        expect(output[2]).toMatch(`cat ${dir}/${filename}\r\nHello\r\n`);
      });
    });

    DIRECTORIES_THAT_DONT_PERSIST.forEach(dir => {
      test(`should persist file in ${dir}`, async ({ page }) => {
        const filename = 'abc.txt';
        const output = await shellLineSimpleN(page, [
          `cat ${dir}/${filename}`,
          `echo Hello > ${dir}/${filename}`,
          `cat ${dir}/${filename}`
        ]);
        expect(output[0]).toMatch(`\r\ncat: ${dir}/${filename}: No such file or directory\r\n`);
        expect(output[2]).toMatch(`\r\ncat: ${dir}/${filename}: No such file or directory\r\n`);
      });
    });
  });

  test.describe('cd and pwd', () => {
    [...DIRECTORIES_THAT_PERSIST, ...DIRECTORIES_THAT_DONT_PERSIST].forEach(dir => {
      test(`should cd into ${dir}`, async ({ page }) => {
        const output = await shellLineSimpleN(page, ['pwd', `cd ${dir}`, 'pwd']);
        expect(output[0]).toMatch('pwd\r\n/drive\r\n');
        expect(output[1]).toMatch(`cd ${dir}\r\n`);
        expect(output[2]).toMatch(`pwd\r\n${dir}\r\n`);
      });
    });
  });

  test('should fail to create new top-level directory', async ({ page }) => {
    const output = await shellLineSimple(page, 'mkdir /new-directory');
    expect(output).toMatch('\r\nmkdir: cannot create directory');
    expect(output).toMatch('Permission denied\r\n');
  });
});
