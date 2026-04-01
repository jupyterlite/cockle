import { expect } from '@playwright/test';
import { shellLineSimple, shellLineSimpleN, test } from '../utils';

test.describe('cat command', () => {
  test('should write to stdout', async ({ page }) => {
    expect(await shellLineSimple(page, 'cat file1')).toMatch('\r\nContents of the file\r\n');
  });

  test('should write large file', async ({ page }) => {
    const output = await shellLineSimpleN(page, ['seq 20000 > a.txt', 'cat a.txt']);
    const lines = output[1].split('\r\n');
    expect(lines).toHaveLength(20002);
  });
});
