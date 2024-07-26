import { expect } from '@playwright/test';
import { shellRunSimple, test } from '../utils';

test.describe('alias command', () => {
  test('should write to stdout', async ({ page }) => {
    expect(await shellRunSimple(page, 'alias')).toEqual(
      "dir='dir --color=auto'\r\n" +
        "grep='grep --color=auto'\r\n" +
        "ls='ls --color=auto'\r\n" +
        "ll='ls -lF'\r\n" +
        "vdir='vdir --color=auto'\r\n"
    );
  });
});
