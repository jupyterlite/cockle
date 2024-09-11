import { expect } from '@playwright/test';
import { shellLineSimple, shellLineSimpleN, test } from '../utils';

test.describe('lua command', () => {
  test('should write to stdout', async ({ page }) => {
    const output = await shellLineSimple(page, 'lua -v');
    expect(output).toMatch('Lua 5.4.6  Copyright (C) 1994-2023 Lua.org, PUC-Rio');
  });

  test('should run lua script', async ({ page }) => {
    const options = {
      initialFiles: {
        'factorial.lua':
          'function factorial(n)\n' +
          '  if n == 0 then\n' +
          '    return 1\n' +
          '  else\n' +
          '    return n * factorial(n-1)\n' +
          '  end\n' +
          'end\n' +
          'print(factorial(tonumber(arg[1])))\n'
      }
    };
    const output = await shellLineSimpleN(
      page,
      ['lua factorial.lua 1', 'lua factorial.lua 3', 'lua factorial.lua 5'],
      options
    );
    expect(output[0]).toMatch(/^lua factorial.lua 1\r\n1\r\n/);
    expect(output[1]).toMatch(/^lua factorial.lua 3\r\n6\r\n/);
    expect(output[2]).toMatch(/^lua factorial.lua 5\r\n120\r\n/);
  });
});
