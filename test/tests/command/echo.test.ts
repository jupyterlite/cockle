import { expect } from '@playwright/test';
import { shellLineSimple, test } from '../utils';

test.describe('echo command', () => {
  test('should write to stdout', async ({ page }) => {
    expect(await shellLineSimple(page, 'echo some text')).toMatch('\r\nsome text\r\n');
  });
});
