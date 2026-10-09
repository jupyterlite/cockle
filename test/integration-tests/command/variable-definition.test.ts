import { expect } from '@playwright/test';
import { shellLineSimpleN, test } from '../utils';

test.describe('variable definition', () => {
  test('should persist a standalone assignment for a later command', async ({ page }) => {
    const output = await shellLineSimpleN(page, ['A=1', 'echo $A', 'A=2', 'echo $A']);
    expect(output[1]).toMatch('\r\n1\r\n');
    expect(output[3]).toMatch('\r\n2\r\n');
  });

  test('should define multiple names left to right', async ({ page }) => {
    const output = await shellLineSimpleN(page, ['B=1 C=2', 'echo $B$C']);
    expect(output[1]).toMatch('\r\n12\r\n');
  });

  test('should use values from earlier names on the same line', async ({ page }) => {
    const output = await shellLineSimpleN(page, ['D=hello', 'D=1 E=$D', 'echo $E']);
    expect(output[2]).toMatch('\r\n1\r\n'); // E=$D sees D=1, not D=hello
  });

  test('should assign a value containing spaces and expanded references', async ({ page }) => {
    const output = await shellLineSimpleN(page, [
      'P=/my/path',
      'Q=$P/file',
      'echo $Q',
      'R="a b"',
      'echo $R'
    ]);
    expect(output[2]).toMatch('\r\n/my/path/file\r\n');
    expect(output[4]).toMatch('\r\na b\r\n');
  });

  test('should define an empty value', async ({ page }) => {
    const output = await shellLineSimpleN(page, ['S=1', 'S=', 'echo x$S-y']);
    expect(output[2]).toMatch('\r\nx-y\r\n');
  });

  test('should reject an invalid name as a command not found', async ({ page }) => {
    const output = await shellLineSimpleN(page, ['1X=2']);
    expect(output[0]).toMatch("'1X=2': command not found");
  });

  test('should reject a name which is not a valid identifier', async ({ page }) => {
    // bash runs all of these as commands, reporting command not found.
    const output = await shellLineSimpleN(page, ['A-B=1', 'A.1=2', 'A@1=2', 'A$B=1']);
    expect(output[0]).toMatch("'A-B=1': command not found");
    expect(output[1]).toMatch("'A.1=2': command not found");
    expect(output[2]).toMatch("'A@1=2': command not found");
    expect(output[3]).toMatch("'A$B=1': command not found");
  });

  test('should reject a quoted name and expand a quoted value', async ({ page }) => {
    const output = await shellLineSimpleN(page, ["'X'=1", 'A=B=1', 'echo $A']);
    expect(output[0]).toMatch(/'X=1': command not found/);
    expect(output[2]).toMatch('\r\nB=1\r\n');
  });

  test('should succeed with exit code 0 for a standalone assignment', async ({ page }) => {
    const exitCode = await page.evaluate(async () => {
      const { shell } = await globalThis.cockle.shellSetupSimple();
      await shell.inputLine('Z_ASSIGN=1');
      return await shell.exitCode();
    });
    expect(exitCode).toBe(0);
  });

  test('should pass a standalone assignment to a child command', async ({ page }) => {
    // Known divergence from bash: the shell keeps a single flat environment, so a variable that
    // was not exported is still visible to child commands. See README 'Variables and expansion'.
    const output = await shellLineSimpleN(page, ['NE=1', 'env | grep ^NE=']);
    expect(output[1]).toMatch('\r\nNE=1\r\n');
  });

  test('should define a variable from an expanded reference', async ({ page }) => {
    const output = await shellLineSimpleN(page, [
      'export BASE=/base',
      'DERIVED=$BASE/x',
      'echo $DERIVED'
    ]);
    expect(output[2]).toMatch('\r\n/base/x\r\n');
  });

  test('should not let an assignment-looking argument be an assignment', async ({ page }) => {
    const output = await shellLineSimpleN(page, ['echo A=1']);
    expect(output[0]).toMatch('\r\nA=1\r\n');
  });
});
