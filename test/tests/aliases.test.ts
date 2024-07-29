import { expect, type Page } from '@playwright/test';
import { test } from './utils';

// Wrappers to call Aliases functions in browser context.
async function get(page: Page, text: string): Promise<any> {
  return await page.evaluate(async text => {
    const { shell } = await globalThis.cockle.shell_setup_empty();
    return shell.aliases.get(text);
  }, text);
}

async function getRecursive(page: Page, text: string): Promise<any> {
  return await page.evaluate(async text => {
    const { shell } = await globalThis.cockle.shell_setup_empty();
    return shell.aliases.getRecursive(text);
  }, text);
}

async function match(page: Page, text: string): Promise<any> {
  return await page.evaluate(async text => {
    const { shell } = await globalThis.cockle.shell_setup_empty();
    return shell.aliases.match(text);
  }, text);
}

test.describe('Aliases', () => {
  test.describe('get', () => {
    test('should return alias string', async ({ page }) => {
      expect(await get(page, 'grep')).toEqual('grep --color=auto');
    });

    test('should return undefined for unknown key', async ({ page }) => {
      expect(await get(page, 'unknown')).toBeUndefined();
    });
  });

  test.describe('getRecursive', () => {
    test('should return undefined for unknown key', async ({ page }) => {
      expect(await getRecursive(page, 'unknown')).toBeUndefined();
    });

    test('should lookup ls', async ({ page }) => {
      expect(await getRecursive(page, 'ls')).toEqual('ls --color=auto');
    });

    test('should lookup ll', async ({ page }) => {
      expect(await getRecursive(page, 'll')).toEqual('ls --color=auto -lF');
    });

    test('should lookup grep', async ({ page }) => {
      expect(await getRecursive(page, 'grep')).toEqual('grep --color=auto');
    });
  });

  test.describe('match', () => {
    test('should match multiple possibilities', async ({ page }) => {
      expect(await match(page, 'l')).toEqual(['ls', 'll']);
    });

    test('should match zero possibilities', async ({ page }) => {
      expect(await match(page, 'z')).toEqual([]);
    });
  });
});
