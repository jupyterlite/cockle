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

  test('should set from cockle-config-in.json', async ({ page }) => {
    const output = await shellLineSimple(page, 'env | grep ENV_VAR_FROM_COCKLE_CONFIG');
    expect(output).toMatch('\r\nENV_VAR_FROM_COCKLE_CONFIG=xyz123\r\n');
  });
});
