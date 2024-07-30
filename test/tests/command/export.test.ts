import { expect } from '@playwright/test';
import { shellRunSimpleN, test } from '../utils';

test.describe('export command', () => {
  test('should export to env', async ({ page }) => {
    const output = await shellRunSimpleN(page, [
      'env | grep SOME_NAME',
      "export SOME_NAME='a b c'",
      'env | grep SOME_NAME',
      'export SOME_NAME=other23',
      'env | grep SOME_NAME',
      'export SOME_NAME=',
      'env | grep SOME_NAME'
    ]);
    expect(output).toEqual([
      '',
      '',
      'SOME_NAME=a b c\r\n',
      '',
      'SOME_NAME=other23\r\n',
      '',
      'SOME_NAME=\r\n'
    ]);
  });
});
