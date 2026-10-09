import { expect } from '@playwright/test';
import { shellLineSimpleN, test } from '../utils';

test.describe('expansion and assignment correctness', () => {
  test('should expand a redirect target', async ({ page }) => {
    const output = await shellLineSimpleN(page, ['OUT=out.txt', 'echo hi > $OUT', 'ls out.txt']);
    expect(output[2]).toMatch('\r\nout.txt\r\n');
    expect(output[1]).not.toContain('command not found');
  });

  test('should create the redirect file for a standalone assignment', async ({ page }) => {
    const output = await shellLineSimpleN(page, ['A=1 > red.txt', 'ls red.txt', 'echo [$A]']);
    expect(output[1]).toMatch('\r\nred.txt\r\n');
    expect(output[2]).toMatch('\r\n[1]\r\n');
  });

  test('should not let a pure-assignment pipeline element persist', async ({ page }) => {
    const output = await shellLineSimpleN(page, ['C=1 |cat', 'echo [$C]']);
    expect(output[1]).toMatch('\r\n[]\r\n');
  });

  test('should apply a leading assignment to one command only', async ({ page }) => {
    const output = await shellLineSimpleN(page, ['B=1 echo hi', 'echo [$B]']);
    expect(output[0]).toMatch('\r\nhi\r\n');
    expect(output[1]).toMatch('\r\n[]\r\n');
  });

  test('should see an earlier name of the prefix in a later one', async ({ page }) => {
    // bash: 'D=0; D=1 E=$D env' gives E=1, so E sees the prefix value of D and not the shell's.
    const output = await shellLineSimpleN(page, ['D=0', 'D=1 E=$D env|grep -E "^(D|E)="']);
    expect(output[1]).toContain('E=1');
    expect(output[1]).toContain('D=1');
    expect(output[1]).not.toContain('D=0');
  });

  test('should report command not found for an unknown command with a prefix', async ({ page }) => {
    const output = await shellLineSimpleN(page, ['B=1 nosuchcommand_xyz']);
    expect(output[0]).toMatch("'nosuchcommand_xyz': command not found");
  });

  test('should not split an unquoted value with no whitespace', async ({ page }) => {
    const output = await shellLineSimpleN(page, ['SP=a_b', 'echo $SP']);
    expect(output[1]).toMatch('\r\na_b\r\n');
  });

  test('should split an unquoted value on whitespace', async ({ page }) => {
    const output = await shellLineSimpleN(page, ['cat $SP', 'cat "$SP"'], {
      environment: { SP: 'file1 file2' }
    });
    // Unquoted, the value is two fields and cat prints both files; quoted it is one missing file.
    expect(output[0]).toMatch('\r\nContents of the file');
    expect(output[0]).toMatch('Second line\r\n');
    expect(output[1]).toContain('file1 file2');
  });

  test('should drop a field produced only by an expansion', async ({ page }) => {
    const output = await shellLineSimpleN(page, ['echo "a$E b"', 'env $E|grep PATH', 'env "$E"'], {
      environment: { E: '' }
    });
    expect(output[0]).toMatch('\r\na b\r\n');
    // Unquoted, the empty value gives no argument; quoted it stays one empty argument.
    expect(output[1]).toMatch('\r\nPATH=');
    expect(output[2]).not.toBe(output[1]);
  });

  test('should remove a backslash that suppresses expansion', async ({ page }) => {
    const output = await shellLineSimpleN(page, ['X=w', 'echo \\$X', 'echo "\\$X"']);
    expect(output[1]).toMatch('\r\n$X\r\n');
    expect(output[2]).toMatch('\r\n$X\r\n');
  });

  test('should expand a here document body', async ({ page }) => {
    const output = await shellLineSimpleN(page, ['X=w', 'cat <<EOF', '$X', 'EOF']);
    expect(output[3]).toMatch('\r\nw\r\n');
  });

  test('should not expand a here document body with a quoted delimiter', async ({ page }) => {
    const output = await shellLineSimpleN(page, ['X=w', "cat <<'EOF'", '$X', 'EOF']);
    expect(output[3]).toMatch('\r\n$X\r\n');
  });

  test('should report an ambiguous redirect', async ({ page }) => {
    const output = await shellLineSimpleN(page, ["OUT='a b.txt'", 'echo hi > $OUT']);
    expect(output[1]).toContain('$OUT: ambiguous redirect');
  });
});
