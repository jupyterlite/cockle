import { expect } from '@playwright/test';
import { shellLineSimpleN, test } from '../utils';

test.describe('Various js commands', () => {
  test('js-test should write to stdout', async ({ page }) => {
    const output = await shellLineSimpleN(page, ['js-test ab c', 'env | grep ?']);
    expect(output[0]).toMatch('js-test ab c\r\njs-test: ab,c\r\n');
    expect(output[1]).toMatch('\r\n?=0\r\n');
  });

  test('js-capitalise should write to stdout', async ({ page }) => {
    const output = await shellLineSimpleN(page, ['js-capitalise ab c', 'env | grep ?']);
    expect(output[0]).toMatch('js-capitalise ab c\r\njs-capitalise: AB,C\r\n');
    expect(output[1]).toMatch('\r\n?=1\r\n');
  });

  test('multiple commands in order', async ({ page }) => {
    // Multiple commands should be loadable at the same time without affecting each other.
    const output = await shellLineSimpleN(page, [
      'js-test ab c',
      'js-capitalise ab c',
      'js-test x y',
      'js-capitalise x y'
    ]);
    expect(output[0]).toMatch('\r\njs-test: ab,c\r\n');
    expect(output[1]).toMatch('\r\njs-capitalise: AB,C\r\n');
    expect(output[2]).toMatch('\r\njs-test: x,y\r\n');
    expect(output[3]).toMatch('\r\njs-capitalise: X,Y\r\n');
  });
});
