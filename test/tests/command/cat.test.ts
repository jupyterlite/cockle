import { expect } from '@playwright/test';
import { shellRunSimple, test } from '../utils';

test.describe('cat command', () => {
  test('should write to stdout', async ({ page }) => {
    expect(await shellRunSimple(page, 'cat file1')).toEqual('Contents of the file\r\n');
  });
});
