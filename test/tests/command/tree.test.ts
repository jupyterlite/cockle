import { expect } from '@playwright/test';
import { shellLineSimple, test } from '../utils';

test.describe('tree command', () => {
  test('should write version', async ({ page }) => {
    const output = await shellLineSimple(page, 'tree --version');
    expect(output).toMatch(
      '\r\ntree v2.2.1 © 1996 - 2024 by Steve Baker, Thomas Moore, Francesc Rocher, Florian Sesser, Kyosuke Tokoro\r\n'
    );
  });

  test('should write tree', async ({ page }) => {
    const output = await shellLineSimple(page, 'tree');
    expect(output).toMatch(
      'tree\r\n' +
        '.\r\n' +
        '├── dirA\r\n' +
        '├── file1\r\n' +
        '└── file2\r\n' +
        '\r\n' +
        '2 directories, 2 files\r\n'
    );
  });
});
