import { expect } from '@playwright/test';
import { describeCoiAndNonCoi, shellLineSimpleN, test } from '../utils';

describeCoiAndNonCoi('export command', () => {
  test('should export to env', async ({ page }) => {
    const output = await shellLineSimpleN(page, [
      "export SOME_NAME='a b c'",
      'env | grep SOME_NAME',
      'export SOME_NAME=other23',
      'env | grep SOME_NAME',
      'export SOME_NAME=',
      'env | grep SOME_NAME'
    ]);
    expect(output[1]).toMatch("\r\nSOME_NAME='a b c'\r\n");
    expect(output[3]).toMatch('\r\nSOME_NAME=other23\r\n');
    expect(output[5]).toMatch('\r\nSOME_NAME=\r\n');
  });
});
