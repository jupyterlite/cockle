import { expect } from '@playwright/test';
import { shellLineSimple, test } from '../utils';

test.describe('cat command', () => {
  test('should write to stdout', async ({ page }) => {
    expect(await shellLineSimple(page, 'cat file1')).toMatch('\r\nContents of the file\r\n');
  });
});
