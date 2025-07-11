import { expect } from '@playwright/test';
import { shellLineSimple, test } from '../utils';


test.describe('wasm-test', () => {
  test('should write to stdout', async ({ page }) => {
    const output = await shellLineSimple(page, 'wasm-test ab cde');
    expect(output).toMatch('\r\nNumber of arguments: 3\r\nwasm-test\r\nab\r\ncde\r\n');
  });
});
