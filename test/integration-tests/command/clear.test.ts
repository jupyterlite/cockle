import { expect } from '@playwright/test';
import { describeCoiAndNonCoi, shellLineSimple, test } from '../utils';

describeCoiAndNonCoi('clear command', () => {
  test('should emit terminal clear ansi sequence', async ({ page }) => {
    const output = await shellLineSimple(page, 'clear');
    // Note no newline after the clear, before the prompt.
    expect(output).toMatch('clear\r\n\x1b[2J\x1b[3J\x1b[H/drive$');
  });
});
