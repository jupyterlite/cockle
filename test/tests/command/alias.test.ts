import { expect } from '@playwright/test';
import { shellRunSimple, shellRunSimpleN, test } from '../utils';

test.describe('alias command', () => {
  test('should write all to stdout', async ({ page }) => {
    expect(await shellRunSimple(page, 'alias')).toEqual(
      "dir='dir --color=auto'\r\n" +
        "grep='grep --color=auto'\r\n" +
        "ls='ls --color=auto'\r\n" +
        "ll='ls -lF'\r\n" +
        "vdir='vdir --color=auto'\r\n"
    );
  });

  test('should write individual aliases to stdout', async ({ page }) => {
    expect(await shellRunSimple(page, 'alias vdir ls')).toEqual(
      "vdir='vdir --color=auto'\r\n" +
        "ls='ls --color=auto'\r\n"
    );
  });

  test('should set alias', async ({ page }) => {
    const output = await shellRunSimpleN(page, ['alias abc="ls -alF"', 'alias | grep abc']);
    expect(output).toEqual(['', "abc='ls -alF'\r\n"]);
  });
});
