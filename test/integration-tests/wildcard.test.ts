import { expect } from '@playwright/test';
import { shellLineComplexN, shellLineSimpleN, test } from './utils';

test.describe('filename expansion', () => {
  test('should expand * and ?', async ({ page }) => {
    const output = await shellLineSimpleN(page, [
      'echo file*',
      'echo file?',
      'echo f*',
      'echo dir*'
    ]);
    expect(output[0]).toMatch('echo file*\r\nfile1 file2\r\n');
    expect(output[1]).toMatch('echo file?\r\nfile1 file2\r\n');
    expect(output[2]).toMatch('echo f*\r\nfile1 file2\r\n');
    expect(output[3]).toMatch('echo dir*\r\ndirA\r\n');
  });

  test('should expand bracket expressions', async ({ page }) => {
    const output = await shellLineSimpleN(page, [
      'echo file[12]',
      'echo file[!2]',
      'echo file[^2]',
      'echo file[1-2]'
    ]);
    expect(output[0]).toMatch('echo file[12]\r\nfile1 file2\r\n');
    expect(output[1]).toMatch('echo file[!2]\r\nfile1\r\n');
    expect(output[2]).toMatch('echo file[^2]\r\nfile1\r\n');
    expect(output[3]).toMatch('echo file[1-2]\r\nfile1 file2\r\n');
  });

  test('should not expand a quoted or escaped wildcard', async ({ page }) => {
    const output = await shellLineSimpleN(page, [
      "echo 'f*'",
      'echo "file?"',
      'echo f\\*',
      "echo 'file[12]'",
      'echo file\\?'
    ]);
    expect(output[0]).toMatch('f*\r\n');
    expect(output[0]).not.toMatch('file1');
    expect(output[1]).toMatch('file?\r\n');
    expect(output[1]).not.toMatch('file1');
    expect(output[2]).toMatch('f*\r\n');
    expect(output[2]).not.toMatch('file1');
    expect(output[3]).toMatch("'file[12]'\r\nfile[12]\r\n");
    expect(output[4]).toMatch('file\\?\r\nfile?\r\n');
  });

  test('should expand a wildcard from an unquoted expansion only', async ({ page }) => {
    const output = await shellLineSimpleN(page, ["export A='file*'", 'echo $A', 'echo "$A"']);
    expect(output[1]).toMatch('echo $A\r\nfile1 file2\r\n');
    expect(output[2]).toMatch('echo "$A"\r\nfile*\r\n');
  });

  test('should keep a wildcard that matches nothing', async ({ page }) => {
    const output = await shellLineSimpleN(page, ['echo z*', 'echo f* z*', 'echo file[9]']);
    expect(output[0]).toMatch('echo z*\r\nz*\r\n');
    expect(output[1]).toMatch('echo f* z*\r\nfile1 file2 z*\r\n');
    expect(output[2]).toMatch('echo file[9]\r\nfile[9]\r\n');
  });

  test('should match a trailing slash against directories only', async ({ page }) => {
    const output = await shellLineSimpleN(page, ['echo dir*/', 'echo file*/']);
    expect(output[0]).toMatch('echo dir*/\r\ndirA/\r\n');
    expect(output[1]).toMatch('echo file*/\r\nfile*/\r\n');
  });

  test('should collapse repeated slashes after a wildcard', async ({ page }) => {
    const output = await shellLineComplexN(page, [
      'echo dir//sub*',
      'echo d*//sub*',
      'echo dir/*//nested*',
      'echo dir//*//nestedfile'
    ]);
    expect(output[0]).toMatch('echo dir//sub*\r\ndir//subdir dir//subfile.md dir//subfile.txt\r\n');
    expect(output[1]).toMatch('echo d*//sub*\r\ndir/subdir dir/subfile.md dir/subfile.txt\r\n');
    expect(output[2]).toMatch('echo dir/*//nested*\r\ndir/subdir/nestedfile\r\n');
    expect(output[3]).toMatch('echo dir//*//nestedfile\r\ndir//subdir/nestedfile\r\n');
  });

  test('should expand an absolute pattern', async ({ page }) => {
    const output = await shellLineSimpleN(page, ['echo /drive/file?', 'echo /drive/dir*']);
    expect(output[0]).toMatch('echo /drive/file?\r\n/drive/file1 /drive/file2\r\n');
    expect(output[1]).toMatch('echo /drive/dir*\r\n/drive/dirA\r\n');
  });

  test('should expand an argument starting with a dash', async ({ page }) => {
    const output = await page.evaluate(async () => {
      const { shell, output } = await globalThis.cockle.shellSetupSimple({
        initialFiles: { '-dashed': '' }
      });
      await shell.inputLine('echo -*');
      return output.textAndClear();
    });
    expect(output).toMatch('echo -*\r\n-dashed\r\n');
  });

  test('should not match hidden files unless the pattern starts with a dot', async ({ page }) => {
    const output = await page.evaluate(async () => {
      const { shell, output } = await globalThis.cockle.shellSetupSimple({
        initialFiles: { '.hidden': '' }
      });
      const ret: string[] = [];
      for (const line of ['echo *', 'echo .*', 'echo *hidden*']) {
        await shell.inputLine(line);
        ret.push(output.textAndClear());
      }
      return ret;
    });
    expect(output[0]).toMatch('echo *\r\ndirA file1 file2\r\n');
    expect(output[0]).not.toMatch('.hidden');
    // As bash does, '.' and '..' are not matches even for a pattern starting with a dot.
    expect(output[1]).toMatch('echo .*\r\n.hidden\r\n');
    expect(output[1]).not.toMatch(/(?:^|\s)\.\.?(?=\s|$)/m);
    expect(output[2]).toMatch('echo *hidden*\r\n*hidden*\r\n');
  });

  test('should match wildcards at several directory levels', async ({ page }) => {
    const output = await shellLineComplexN(page, [
      'echo dir*',
      'echo dir/*.txt',
      'echo dir/sub*/nestedfile',
      'echo dir/*/*',
      'echo dir/*/',
      'echo */*.txt'
    ]);
    expect(output[0]).toMatch('echo dir*\r\ndir\r\n');
    expect(output[1]).toMatch('echo dir/*.txt\r\ndir/subfile.txt\r\n');
    expect(output[2]).toMatch('echo dir/sub*/nestedfile\r\ndir/subdir/nestedfile\r\n');
    expect(output[3]).toMatch('echo dir/*/*\r\ndir/subdir/nestedfile\r\n');
    expect(output[4]).toMatch('echo dir/*/\r\ndir/subdir/\r\n');
    expect(output[5]).toMatch('echo */*.txt\r\ndir/subfile.txt\r\n');
  });
});
