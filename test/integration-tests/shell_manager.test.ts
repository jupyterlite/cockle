import { expect } from '@playwright/test';
import { test } from './utils';

test.describe('ShellManager', () => {
  test('should support no shells created', async ({ page }) => {
    const output = await page.evaluate(async () => {
      const { shellManager } = globalThis.cockle;
      return shellManager.shellIds();
    });
    expect(output).toEqual([]);
  });

  test('should support one shell created', async ({ page }) => {
    const output = await page.evaluate(async () => {
      const { shellManager, shellSetupEmpty } = globalThis.cockle;
      const { shell } = await shellSetupEmpty({ shellManager });
      const ret0 = shell.shellId;
      const ret1 = shellManager.shellIds();
      shell.dispose();
      const ret2 = shellManager.shellIds();
      return [ret0, ret1, ret2];
    });
    const shellId = output[0];
    expect(shellId).toEqual(expect.any(String));
    expect(shellId.length).toBeGreaterThan(0);

    expect(output[1]).toEqual([shellId]);
    expect(output[2]).toEqual([]);
  });

  test('should support two shells created', async ({ page }) => {
    const output = await page.evaluate(async () => {
      const { shellManager, shellSetupEmpty } = globalThis.cockle;
      const shell0 = (await shellSetupEmpty({ shellManager })).shell;
      const shell1 = (await shellSetupEmpty({ shellManager })).shell;
      const ret0 = shell0.shellId;
      const ret1 = shell1.shellId;
      const ret2 = shellManager.shellIds();
      shell0.dispose();
      shell1.dispose();
      const ret3 = shellManager.shellIds();
      return [ret0, ret1, ret2, ret3];
    });
    const shellId0 = output[0];
    expect(shellId0).toEqual(expect.any(String));
    expect(shellId0.length).toBeGreaterThan(0);

    const shellId1 = output[1];
    expect(shellId1).toEqual(expect.any(String));
    expect(shellId1.length).toBeGreaterThan(0);

    expect(shellId0).not.toEqual(shellId1);

    expect(output[2]).toEqual(expect.arrayContaining([shellId0, shellId1]));
    expect(output[3]).toEqual([]);
  });

  test('should throw on duplicate shellIds', async ({ page }) => {
    const output = await page.evaluate(async () => {
      const { shellManager, shellSetupEmpty } = globalThis.cockle;
      const shellId = 'abc'; // Use the same shellId multiple times.
      await shellSetupEmpty({ shellId, shellManager });
      try {
        await shellSetupEmpty({ shellId, shellManager });
      } catch (err: any) {
        return err.message;
      }
      return undefined;
    });
    expect(output).toEqual('Duplicate shellId: abc');
  });
});
