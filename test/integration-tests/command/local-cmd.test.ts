import { expect } from '@playwright/test';
import { shellLineSimple, test } from '../utils';

test.describe('local-cmd command', () => {
  test('should write to stdout', async ({ page }) => {
    const output = await shellLineSimple(page, 'local-cmd ab cde');
    expect(output).toMatch('\r\nNumber of arguments: 3\r\nlocal-cmd\r\nab\r\ncde\r\n');
  });
});
