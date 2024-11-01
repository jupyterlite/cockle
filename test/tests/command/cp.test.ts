import { expect } from '@playwright/test';
import { shellLineSimpleN, test } from '../utils';

test.describe('cp command', () => {
  test('should copy single file', async ({ page }) => {
    const output = await shellLineSimpleN(page, [
      // Check initial conditions
      'ls file1',
      'ls copy',
      'cat file1',
      // Copy file
      'cp file1 copy',
      // Check results
      'ls file1',
      'ls copy',
      'cat file1',
      'cat copy'
    ]);
    expect(output[0]).toMatch(/^ls file1\r\nfile1\r\n/);
    expect(output[1]).toMatch(/cannot access 'copy': No such file or directory/);
    expect(output[2]).toMatch(/^cat file1\r\nContents of the file\r\n/);
    expect(output[4]).toMatch(/^ls file1\r\nfile1\r\n/);
    expect(output[5]).toMatch(/^ls copy\r\ncopy\r\n/);
    expect(output[6]).toMatch(/^cat file1\r\nContents of the file\r\n/);
    expect(output[7]).toMatch(/^cat copy\r\nContents of the file\r\n/);
  });
});
