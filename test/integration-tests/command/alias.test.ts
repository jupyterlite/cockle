import { expect } from '@playwright/test';
import { shellLineSimple, shellLineSimpleN, test } from '../utils';

test.describe('alias command', () => {
  test('should write all to stdout', async ({ page }) => {
    expect(await shellLineSimple(page, 'alias')).toMatch(
      "\r\ndir='dir --color=auto'\r\n" +
        "grep='grep --color=auto'\r\n" +
        "ls='ls --color=auto'\r\n" +
        "ll='ls -lF'\r\n" +
        "vdir='vdir --color=auto'\r\n"
    );
  });

  test('should write individual aliases to stdout', async ({ page }) => {
    expect(await shellLineSimple(page, 'alias vdir ls')).toMatch(
      "\r\nvdir='vdir --color=auto'\r\nls='ls --color=auto'\r\n"
    );
  });

  test('should set alias', async ({ page }) => {
    const output = await shellLineSimpleN(page, ['alias abc="ls -alF"', 'alias | grep abc']);
    expect(output[1]).toMatch("\r\nabc='ls -alF'\r\n");
  });

  test('should set alias from cockle-config-in.json', async ({ page }) => {
    const output = await shellLineSimple(page, 'alias vi');
    expect(output).toMatch("alias vi\r\nvi='vim'\r\n");
  });
});
