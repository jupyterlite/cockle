import { expect } from '@playwright/test';
import { shellLineSimple, shellLineSimpleN, test } from '../utils';

test.describe('environment variable expansion', () => {
  test('should expand unquoted and double-quoted references', async ({ page }) => {
    const output = await shellLineSimpleN(page, [
      'export GREETING=hello',
      'echo $GREETING',
      "echo '$GREETING'",
      'echo "$GREETING"'
    ]);
    expect(output[1]).toMatch('\r\nhello\r\n');
    expect(output[2]).toMatch('\r\n$GREETING\r\n');
    expect(output[3]).toMatch('\r\nhello\r\n');
  });

  test('should expand an unset variable to an empty string', async ({ page }) => {
    const output = await shellLineSimple(page, 'echo a$NOT_SET_ANYWHERE b');
    expect(output).toMatch('\r\na b\r\n');
  });

  test('should expand a reference adjacent to a quoted section', async ({ page }) => {
    const output = await shellLineSimpleN(page, ['export X=x', "echo 'a'$X", "echo $X'a'"]);
    expect(output[1]).toMatch('\r\nax\r\n');
    expect(output[2]).toMatch('\r\nxa\r\n');
  });

  test('should expand the value part of an assignment', async ({ page }) => {
    const output = await shellLineSimpleN(page, [
      'export BASE=prefix',
      'export DERIVED=$BASE-value',
      'echo $DERIVED'
    ]);
    expect(output[2]).toMatch('\r\nprefix-value\r\n');
  });

  test('should expand in args of a wasm command', async ({ page }) => {
    const output = await shellLineSimpleN(page, ['export MYVAR=23', 'env MYENV=$MYVAR|grep MYENV']);
    expect(output[1]).toMatch(/env MYENV=\$MYVAR\|grep MYENV\r\nMYENV=23\r\n/);
  });

  test('should expand $HOME when the environment provides it', async ({ page }) => {
    const output = await shellLineSimpleN(page, ['echo $HOME'], {
      environment: { HOME: '/home/cockle' }
    });
    expect(output[0]).toMatch('\r\n/home/cockle\r\n');
  });

  test('should leave a dollar that starts no reference alone', async ({ page }) => {
    const output = await shellLineSimpleN(page, ['echo cost$', 'echo ${']);
    expect(output[0]).toMatch('\r\ncost$\r\n');
    expect(output[1]).toMatch('\r\n${\r\n');
  });
});
