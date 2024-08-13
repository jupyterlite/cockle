import { expect } from '@playwright/test';
import { shellLineSimple, test } from '../utils';

test.describe('env command', () => {
  test('should write to stdout', async ({ page }) => {
    const output = await shellLineSimple(page, 'env MYENV=23|grep MYENV');
    expect(output).toMatch(/env MYENV=23|grep MYENV\r\nMYENV=23\r\n/);
  });

  test('should support quotes', async ({ page }) => {
    const output = await shellLineSimple(page, 'env MYENV="ls -alF"|grep MYENV');
    expect(output).toMatch(/env MYENV="ls -alF"|grep MYENV\r\nMYENV=ls -alF\r\n/);
  });
});
