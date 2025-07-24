import { expect } from '@playwright/test';
import { shellLineSimple, test } from '../utils';

test.describe('cd command', () => {
  test('should print command name', async ({ page }) => {
    expect(await shellLineSimple(page, 'which cd')).toMatch(/cd/);
  });

  test('should error for unknown command', async ({ page }) => {
    expect(await shellLineSimple(page, 'which unknown')).toMatch(/no unknown command/);
  });
});
