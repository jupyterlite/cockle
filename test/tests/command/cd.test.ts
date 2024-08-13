import { expect } from '@playwright/test';
import { shellLineSimple, shellLineSimpleN, test } from '../utils';

test.describe('cd command', () => {
  test('should do nothing if no arguments', async ({ page }) => {
    const output = await shellLineSimpleN(page, ['pwd', 'cd', 'pwd']);
    expect(output[0]).toMatch('\r\n/drive\r\n');
    expect(output[2]).toMatch('\r\n/drive\r\n');
  });

  test('should error if more than one argument', async ({ page }) => {
    expect(await shellLineSimple(page, 'cd a b')).toMatch(/cd: too many arguments/);
  });

  test('should change directory', async ({ page }) => {
    const output = await shellLineSimpleN(page, ['pwd', 'cd dirA', 'pwd']);
    expect(output[0]).toMatch('\r\n/drive\r\n');
    expect(output[2]).toMatch('\r\n/drive/dirA\r\n');
  });

  test('should update PWD', async ({ page }) => {
    const output = await shellLineSimpleN(page, ['env|grep PWD', 'cd dirA', 'env|grep PWD']);
    expect(output[0]).toMatch('\r\nPWD=/drive\r\n');
    expect(output[2]).toMatch('\r\nPWD=/drive/dirA\r\n');
  });

  test('should support cd -', async ({ page }) => {
    const output = await shellLineSimpleN(page, [
      'cd dirA',
      'env|grep PWD',
      'cd -',
      'env|grep PWD'
    ]);
    expect(output[1]).toMatch('\r\nPWD=/drive/dirA\r\nOLDPWD=/drive\r\n');
    expect(output[3]).toMatch('\r\nPWD=/drive\r\nOLDPWD=/drive/dirA\r\n');
  });

  test('should error if use cd - and OLDPWD not set', async ({ page }) => {
    expect(await shellLineSimple(page, 'cd -')).toMatch(/cd: OLDPWD not set/);
  });
});
