import { expect } from '@playwright/test';
import { shellLineSimple, test } from '../utils';

test.describe('wc command', () => {
  test('should read from single file as argument', async ({ page }) => {
    expect(await shellLineSimple(page, 'wc file2')).toMatch('\r\n 1  5 27 file2\r\n');
  });

  test('should read from multiple files as arguments', async ({ page }) => {
    expect(await shellLineSimple(page, 'wc file1 file2')).toMatch(
      '\r\n 0  4 20 file1\r\n 1  5 27 file2\r\n 1  9 47 total\r\n'
    );
  });

  test('should read single file from stdin', async ({ page }) => {
    expect(await shellLineSimple(page, 'wc < file2')).toMatch('\r\n      1       5      27\r\n');
  });
});
