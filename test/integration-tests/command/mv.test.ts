import { expect } from '@playwright/test';
import { shellLineSimpleN, test } from '../utils';

test.describe('mv command', () => {
  test('should move single file', async ({ page }) => {
    const output = await shellLineSimpleN(page, [
      // Check initial conditions
      'ls file1',
      'ls copy',
      'cat file1',
      // Move file
      'mv file1 copy',
      // Check results
      'ls file1',
      'ls copy',
      'cat copy'
    ]);
    expect(output[0]).toMatch(/^ls file1\r\nfile1\r\n/);
    expect(output[1]).toMatch(/cannot access 'copy': No such file or directory/);
    expect(output[2]).toMatch(/^cat file1\r\nContents of the file\r\n/);
    expect(output[4]).toMatch(/cannot access 'file1': No such file or directory/);
    expect(output[5]).toMatch(/^ls copy\r\ncopy\r\n/);
    expect(output[6]).toMatch(/^cat copy\r\nContents of the file\r\n/);
  });
});
