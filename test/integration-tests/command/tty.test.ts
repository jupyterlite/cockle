import { expect } from '@playwright/test';
import { shellLineSimple, test } from '../utils';

test.describe('tty command', () => {
  test('should write to stdout', async ({ page }) => {
    expect(await shellLineSimple(page, 'tty')).toMatch(/^tty\r\n\/dev\/tty\r\n/);
  });
});
