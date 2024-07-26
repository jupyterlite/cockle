import { expect } from '@playwright/test';
import { shellRunSimple, test } from '../utils';

test.describe('echo command', () => {
  test('should write to stdout', async ({ page }) => {
    expect(await shellRunSimple(page, 'echo some text')).toEqual('some text\r\n');
  });
});
