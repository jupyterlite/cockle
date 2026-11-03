import { expect } from '@playwright/test';
import { shellLineComplexN, shellLineSimple, test } from '../utils';

test.describe('find command', () => {
  test('should write version', async ({ page }) => {
    expect(await shellLineSimple(page, 'find --version')).toMatch(
      /\r\nfind \(GNU findutils\) \d+\.\d+\.\d+\r\n/
    );
  });

  test('should not expand a quoted or escaped -name pattern', async ({ page }) => {
    const output = await shellLineComplexN(page, [
      "find . -name '*.txt' | sort",
      'find . -name "*.txt" | sort',
      'find . -name \\*.txt | sort',
      "find . -name 'file[12].txt' | sort"
    ]);
    const txt = '\r\n./dir/subfile.txt\r\n./file1.txt\r\n./file2.txt\r\n';
    expect(output[0]).toMatch(txt);
    expect(output[1]).toMatch(txt);
    expect(output[2]).toMatch(txt);
    expect(output[3]).toMatch('\r\n./file1.txt\r\n./file2.txt\r\n');
    expect(output[3]).not.toMatch('subfile');
  });

  test('should not expand a quoted variable -name pattern', async ({ page }) => {
    const output = await shellLineComplexN(page, [
      "export P='*.txt'",
      'find . -name "$P" | sort',
      'find . -name $P'
    ]);
    expect(output[1]).toMatch('\r\n./dir/subfile.txt\r\n./file1.txt\r\n./file2.txt\r\n');
    expect(output[2]).toMatch(/paths must precede expression: .file2\.txt./);
  });

  test('should expand an unquoted -name pattern', async ({ page }) => {
    const output = await shellLineComplexN(page, [
      'find . -name *.txt',
      'find . -name other*',
      'find . -name *.md'
    ]);
    // Expands to two filenames.
    expect(output[0]).toMatch(/paths must precede expression: .file2\.txt./);
    // Expands to a single filename.
    expect(output[1]).toMatch('find . -name other*\r\n./otherfile\r\n');
    // Matches nothing in cwd so is passed through unexpanded.
    expect(output[2]).toMatch('find . -name *.md\r\n./dir/subfile.md\r\n');
  });

  test('should expand wildcards in start paths', async ({ page }) => {
    const output = await shellLineComplexN(page, [
      'find d* -name nested*',
      'find dir/sub* -type f | sort'
    ]);
    expect(output[0]).toMatch('find d* -name nested*\r\ndir/subdir/nestedfile\r\n');
    expect(output[1]).toMatch('\r\ndir/subdir/nestedfile\r\ndir/subfile.md\r\ndir/subfile.txt\r\n');
  });

  test('should report error and exit status for missing path', async ({ page }) => {
    const output = await shellLineComplexN(page, [
      'find nosuchdir',
      'echo $?',
      'find dir',
      'echo $?'
    ]);
    expect(output[0]).toMatch(/find: .nosuchdir.: No such file or directory/);
    expect(output[1]).toMatch('echo $?\r\n1\r\n');
    expect(output[3]).toMatch('echo $?\r\n0\r\n');
  });

  test('should support -type', async ({ page }) => {
    const output = await shellLineComplexN(page, [
      'find . -type d | sort',
      'find . -type f | sort'
    ]);
    expect(output[0]).toMatch('find . -type d | sort\r\n.\r\n./dir\r\n./dir/subdir\r\n');
    expect(output[1]).toMatch(
      'find . -type f | sort\r\n' +
        './dir/subdir/nestedfile\r\n' +
        './dir/subfile.md\r\n' +
        './dir/subfile.txt\r\n' +
        './file1.txt\r\n' +
        './file2.txt\r\n' +
        './otherfile\r\n'
    );
  });

  test('should support -maxdepth and -mindepth', async ({ page }) => {
    const output = await shellLineComplexN(page, [
      'find . -maxdepth 1 | sort',
      'find . -mindepth 2 | sort'
    ]);
    expect(output[0]).toMatch(
      'find . -maxdepth 1 | sort\r\n.\r\n./dir\r\n./file1.txt\r\n./file2.txt\r\n./otherfile\r\n'
    );
    expect(output[1]).toMatch(
      'find . -mindepth 2 | sort\r\n' +
        './dir/subdir\r\n' +
        './dir/subdir/nestedfile\r\n' +
        './dir/subfile.md\r\n' +
        './dir/subfile.txt\r\n'
    );
  });

  test('should support -iname and -path', async ({ page }) => {
    const output = await shellLineComplexN(page, [
      "find . -iname '*.TXT' | sort",
      "find . -path '*/subdir/*'"
    ]);
    expect(output[0]).toMatch('\r\n./dir/subfile.txt\r\n./file1.txt\r\n./file2.txt\r\n');
    expect(output[1]).toMatch('\r\n./dir/subdir/nestedfile\r\n');
  });

  test('should support -delete', async ({ page }) => {
    const output = await shellLineComplexN(page, ["find . -name '*.md' -delete", 'ls dir']);
    expect(output[1]).toMatch('ls dir\r\nsubdir\tsubfile.txt\r\n');
  });

  test('should support absolute paths', async ({ page }) => {
    const output = await shellLineComplexN(
      page,
      [
        "find /tmp -name '*.md'",
        "find /home/web_user -name '*.md'",
        "find /drive/dir -name '*.md'"
      ],
      {
        initialFiles: { '/tmp/absolute.md': '', '/home/web_user/home.md': '' }
      }
    );
    expect(output[0]).toMatch("find /tmp -name '*.md'\r\n/tmp/absolute.md\r\n");
    expect(output[1]).toMatch("find /home/web_user -name '*.md'\r\n/home/web_user/home.md\r\n");
    expect(output[2]).toMatch("find /drive/dir -name '*.md'\r\n/drive/dir/subfile.md\r\n");
  });

  test('should support -empty', async ({ page }) => {
    const output = await shellLineComplexN(page, ['find . -empty | sort']);
    expect(output[0]).toMatch(
      'find . -empty | sort\r\n' +
        './dir/subdir/nestedfile\r\n' +
        './dir/subfile.md\r\n' +
        './dir/subfile.txt\r\n' +
        './file1.txt\r\n' +
        './file2.txt\r\n' +
        './otherfile\r\n'
    );
  });
});
