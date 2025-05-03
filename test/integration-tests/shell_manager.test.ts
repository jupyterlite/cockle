import { expect } from '@playwright/test';
import { test } from './utils';

test.describe('ShellManager', () => {
  test('should support no shells created', async ({ page }) => {
    const output = await page.evaluate(async () => {
      const { ShellManager } = globalThis.cockle;
      return ShellManager.ids();
    });
    expect(output).toEqual([]);
  });

  test('should support one shell created', async ({ page }) => {
    const output = await page.evaluate(async () => {
      const { ShellManager, shellSetupEmpty } = globalThis.cockle;
      const { shell } = await shellSetupEmpty();
      const ret0 = shell.id;
      const ret1 = ShellManager.ids();
      shell.dispose();
      const ret2 = ShellManager.ids();
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
      const { ShellManager, shellSetupEmpty } = globalThis.cockle;
      const obj0 = await shellSetupEmpty();
      const shell0 = obj0.shell;
      const obj1 = await shellSetupEmpty();
      const shell1 = obj1.shell;
      const ret0 = shell0.id
      const ret1 = shell1.id;
      const ret2 = ShellManager.ids();
      shell0.dispose();
      shell1.dispose();
      const ret3 = ShellManager.ids();
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
});
