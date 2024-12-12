import { expect } from '@playwright/test';
import { shellLineSimple, test } from '../utils';

test.describe('nano command', () => {
  test('should output version', async ({ page }) => {
    const output = await shellLineSimple(page, 'nano --version');
    expect(output).toMatch(/^nano --version\r\n GNU nano, version 8.2\r\n/);
  });
});
