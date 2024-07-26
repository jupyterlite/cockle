import { expect } from '@playwright/test';
import { shellRunSimple, test } from '../utils';

test.describe('tty command', () => {
  test('should write to stdout', async ({ page }) => {
    expect(await shellRunSimple(page, 'tty')).toEqual('/dev/tty\r\n');
  });
});
