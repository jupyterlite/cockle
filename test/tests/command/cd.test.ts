import { expect } from '@playwright/test';
import { shellRunSimple, shellRunSimpleN, test } from '../utils';

test.describe('cd command', () => {
  test('should do nothing if no arguments', async ({ page }) => {
    expect(await shellRunSimple(page, 'cd')).toEqual('');
  });

  test('should error if more than one argument', async ({ page }) => {
    expect(await shellRunSimple(page, 'cd a b')).toMatch(/cd: too many arguments/);
  });

  test('should change directory', async ({ page }) => {
    const output = await shellRunSimpleN(page, ['pwd', 'cd dirA', 'pwd']);
    expect(output).toEqual(['/drive\r\n', '', '/drive/dirA\r\n']);
  });

  test('should update PWD', async ({ page }) => {
    const output = await page.evaluate(async () => {
      const { shell } = await globalThis.cockle.shell_setup_simple();
      const { environment } = shell;
      const pwd0 = environment.get('PWD');
      await shell._runCommands('cd dirA');
      const pwd1 = environment.get('PWD');
      return [pwd0, pwd1];
    });
    expect(output).toEqual(['/drive', '/drive/dirA']);
  });

  test('should support cd -', async ({ page }) => {
    const output = await page.evaluate(async () => {
      const { shell } = await globalThis.cockle.shell_setup_simple();
      const { environment } = shell;
      const OLDPWD0 = environment.get('OLDPWD');
      await shell._runCommands('cd dirA');
      const OLDPWD1 = environment.get('OLDPWD');
      const PWD1 = environment.get('PWD');
      await shell._runCommands('cd -');
      const OLDPWD2 = environment.get('OLDPWD');
      const PWD2 = environment.get('PWD');
      return { OLDPWD0, OLDPWD1, PWD1, OLDPWD2, PWD2 };
    });
    expect(output['OLDPWD0']).toBeUndefined();
    expect(output['OLDPWD1']).toEqual('/drive');
    expect(output['PWD1']).toEqual('/drive/dirA');
    expect(output['OLDPWD2']).toEqual('/drive/dirA');
    expect(output['PWD2']).toEqual('/drive');
  });

  test('should error if use cd - and OLDPWD not set', async ({ page }) => {
    expect(await shellRunSimple(page, 'cd -')).toMatch(/cd: OLDPWD not set/);
  });
});
