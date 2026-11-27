import { expect } from '@playwright/test';
import { describeCoiAndNonCoi, shellLineSimple, test } from '../utils';

describeCoiAndNonCoi('tty command', () => {
  test('should write to stdout', async ({ page }) => {
    expect(await shellLineSimple(page, 'tty')).toMatch(/^tty\r\n\/dev\/tty\r\n/);
  });
});
