import { expect } from '@playwright/test';
import { describeCoiAndNonCoi, shellLineSimple, test } from '../utils';

describeCoiAndNonCoi('echo command', () => {
  test('should write to stdout', async ({ page }) => {
    expect(await shellLineSimple(page, 'echo some text')).toMatch('\r\nsome text\r\n');
  });
});
