/*
import { expect } from '@playwright/test';
import { test } from './utils';

test.describe('CommandRegistry', () => {
  test('should store commands', async ({ page }) => {
    const output = await page.evaluate(() => {
      const registry = globalThis.cockle.CommandRegistry.instance();
      return [
        registry.get('cat') !== null,
        registry.get('echo') !== null,
        registry.get('env') !== null,
        registry.get('ls') !== null,
        registry.get('unknown') !== null
      ];
    });
    expect(output[0]).toBeTruthy();
    expect(output[1]).toBeTruthy();
    expect(output[2]).toBeTruthy();
    expect(output[3]).toBeTruthy();
    expect(output[4]).toBeFalsy();
  });

  test('should match command names', async ({ page }) => {
    const output = await page.evaluate(() => {
      const registry = globalThis.cockle.CommandRegistry.instance();
      return [registry.match('unkn'), registry.match('ec'), registry.match('e')];
    });
    expect(output[0]).toEqual([]);
    expect(output[1]).toEqual(['echo']);
    expect(output[2]).toEqual(['echo', 'env', 'export', 'expr']);
  });
});
*/
