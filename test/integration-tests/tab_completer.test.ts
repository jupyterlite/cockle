import { expect } from '@playwright/test';
import { shellInputsSimple, shellInputsSimpleN, test } from './utils';
import { keys } from '../serve/keys';

test.describe('TabCompleter', () => {
  test.describe('tab complete commands', () => {
    test('should complete ec', async ({ page }) => {
      expect(await shellInputsSimple(page, ['e', 'c', '\t'])).toEqual('echo ');
    });

    test('should ignore leading whitespace', async ({ page }) => {
      expect(await shellInputsSimple(page, [' ', 'e', 'c', '\t'])).toEqual(' echo ');
    });

    test('should ignore leading whitespace x2', async ({ page }) => {
      expect(await shellInputsSimple(page, [' ', ' ', 'e', 'c', '\t'])).toEqual('  echo ');
    });

    test('should show tab completion options', async ({ page }) => {
      expect(await shellInputsSimple(page, ['e', '\t'])).toMatch(
        /^e\r\necho {4}env {5}exit {4}export {2}expr\r\n/
      );
    });

    test('should do nothing on unknown command', async ({ page }) => {
      expect(await shellInputsSimple(page, ['u', 'n', 'k', '\t'])).toEqual('unk');
    });

    test('should arrange in columns', async ({ page }) => {
      const output = await page.evaluate(async () => {
        const { shell, output } = await globalThis.cockle.shellSetupEmpty();
        await shell.setSize(40, 10);
        await shell.input('t');
        await shell.input('\t');
        const ret0 = output.textAndClear();

        await shell.setSize(40, 20);
        await shell.input('\t');
        const ret1 = output.textAndClear();
        return [ret0, ret1];
      });
      expect(output[0]).toMatch(/^t\r\ntail\r\ntee\r\ntouch\r\ntr\r\ntree\r\ntrue\r\ntty\r\n/);
      expect(output[1]).toMatch(/^\r\ntail {3}tree\r\ntee {4}true\r\ntouch {2}tty/);
    });

    test('should add common startsWith', async ({ page }) => {
      const output = await shellInputsSimpleN(page, [['s', 'h', '\t'], ['\t']]);
      expect(output[0]).toEqual('sha');
      expect(output[1]).toMatch(/sha1sum {4}sha224sum {2}sha256sum {2}sha384sum {2}sha512sum/);
    });

    test('should include aliases', async ({ page }) => {
      expect(await shellInputsSimple(page, ['l', '\t'])).toMatch(
        /^l\r\nless {5}ll {7}ln {7}logname {2}ls {7}lua\r\n/
      );
    });

    test('should complete within a command preserving suffix', async ({ page }) => {
      const { enter, leftArrow, tab } = keys;
      const output = await shellInputsSimpleN(page, [['e', 'c', 'X', leftArrow, tab], [enter]]);
      expect(output[1]).toMatch(/^\r\nX\r\n/);
    });
  });

  test.describe('tab complete filenames', () => {
    test('should do nothing with unrecognised filename', async ({ page }) => {
      expect(await shellInputsSimple(page, ['l', 's', ' ', 'z', '\t'])).toEqual('ls z');
    });

    test('should show tab completion options', async ({ page }) => {
      const output = await shellInputsSimple(page, ['l', 's', ' ', 'f', 'i', 'l', 'e', '\t']);
      expect(output).toMatch(/^ls file\r\nfile1 {2}file2\r\n/);
    });

    test('should add common startsWith', async ({ page }) => {
      expect(await shellInputsSimple(page, ['l', 's', ' ', 'f', '\t'])).toEqual('ls file');
    });

    test('should complete single filename, adding trailing space', async ({ page }) => {
      const output = await shellInputsSimple(page, ['l', 's', ' ', 'f', 'i', 'l', 'e', '1', '\t']);
      expect(output).toEqual('ls file1 ');
    });

    test('should complete single directory, adding trailing slash', async ({ page }) => {
      // Relative path
      const output = await shellInputsSimple(page, ['l', 's', ' ', 'd', '\t']);
      expect(output).toEqual('ls dirA/');

      // Absolute path
      const output1 = await shellInputsSimple(page, ['l', 's', ' ', '/', 'd', 'r', '\t']);
      expect(output1).toEqual('ls /drive/');

      // Absolute nested path
      const output2 = await shellInputsSimple(page, [
        'l',
        's',
        ' ',
        '/',
        'd',
        'r',
        'i',
        'v',
        'e',
        '/',
        'd',
        '\t'
      ]);
      expect(output2).toEqual('ls /drive/dirA/');
    });

    test('should list contents if match directory with trailing slash', async ({ page }) => {
      const output = await shellInputsSimple(page, [
        'l',
        's',
        ' ',
        '/',
        'd',
        'r',
        'i',
        'v',
        'e',
        '/',
        '\t'
      ]);
      expect(output).toMatch(/^ls \/drive\/\r\ndirA\/ {2}file1 {2}file2\r\n/);
      expect(output).toMatch(/ls \/drive\/$/);
    });

    test('should support . for current directory', async ({ page }) => {
      const output = await shellInputsSimple(page, ['l', 's', ' ', '.', '\t']);
      expect(output).toMatch('ls .\r\n../  ./\r\n');
      expect(output).toMatch(/ls .$/);
    });

    test('should support . followed by partial match in current directory', async ({ page }) => {
      const output = await shellInputsSimple(page, [
        'l',
        's',
        ' ',
        '.',
        '/',
        'f',
        'i',
        'l',
        'e',
        '\t'
      ]);
      expect(output).toMatch('ls ./file\r\nfile1  file2\r\n');
      expect(output).toMatch(/ls .\/file$/);
    });

    test('should support .. for parent directory', async ({ page }) => {
      const output = await shellInputsSimple(page, ['l', 's', ' ', '.', '.', '/', 'd', 'r', '\t']);
      expect(output).toMatch(/^ls \.\.\/drive\/$/);
    });

    test('should show . files/directories', async ({ page }) => {
      const options = {
        initialDirectories: ['.adir'],
        initialFiles: { '.afile1': '', '.afile2': '' }
      };
      const output = await shellInputsSimpleN(
        page,
        [
          ['l', 's', ' ', '.', '\t'],
          ['l', 's', ' ', '.', 'a', '\t'],
          ['l', 's', ' ', '.', 'a', 'f', '\t']
        ],
        options
      );
      expect(output[0]).toMatch('ls .\r\n../      ./       .adir/   .afile1  .afile2\r\n');
      expect(output[1]).toMatch('ls .a\r\n.adir/   .afile1  .afile2\r\n');
      expect(output[2]).toEqual('ls .afile');
    });

    test('should show .. files/directories', async ({ page }) => {
      const options = {
        initialDirectories: ['..bdir1', '..bdir2'],
        initialFiles: { '..bfile': '', '.bf': '' }
      };
      const output = await shellInputsSimpleN(
        page,
        [
          ['l', 's', ' ', '.', '.', '\t'],
          ['l', 's', ' ', '.', '.', 'b', '\t'],
          ['l', 's', ' ', '.', '.', 'b', 'd', '\t'],
          ['l', 's', ' ', '.', '.', 'b', 'd', 'i', 'r', '1', '\t']
        ],
        options
      );
      expect(output[0]).toMatch('ls ..\r\n../       ..bdir1/  ..bdir2/  ..bfile\r\n');
      expect(output[1]).toMatch('ls ..b\r\n..bdir1/  ..bdir2/  ..bfile\r\n');
      expect(output[2]).toEqual('ls ..bdir');
      expect(output[3]).toEqual('ls ..bdir1/');
    });

    test('should show all files for command name followed by space', async ({ page }) => {
      expect(await shellInputsSimple(page, ['l', 's', ' ', '\t'])).toMatch(
        /^ls \r\ndirA\/ {2}file1 {2}file2\r\n/
      );
    });
  });

  test.describe('tab complete builtin cd command', () => {
    const options = {
      initialDirectories: ['adir1', 'adir2'],
      initialFiles: { afile1: '', afile2: '' }
    };

    test('should match start of directory, ignoring filenames', async ({ page }) => {
      expect(
        await shellInputsSimple(page, ['c', 'd', ' ', 'a', 'd', 'i', 'r', '\t'], options)
      ).toMatch(/^cd adir\r\nadir1\/ {2}adir2\/\r\n/);
    });

    test('should add common startsWith', async ({ page }) => {
      expect(await shellInputsSimple(page, ['c', 'd', ' ', 'a', '\t'], options)).toMatch(
        /^cd adir$/
      );
    });

    test('should show all directories in cwd if no path mentioned', async ({ page }) => {
      expect(await shellInputsSimple(page, ['c', 'd', ' ', '\t'], options)).toMatch(
        /^cd \r\nadir1\/ {2}adir2\/ {2}dirA\/\r\n/
      );
    });
  });

  test.describe('tab complete builtin cockle-config command', () => {
    test('should show all subcommands if none mentioned', async ({ page }) => {
      expect(await shellInputsSimple(page, ['c', 'o', '\t ', '\t'])).toMatch(
        /^cockle-config \r\ncommand {2}module {3}package {2}stdin\r\n/
      );
    });

    test('should match a single subcommand', async ({ page }) => {
      expect(await shellInputsSimple(page, ['c', 'o', '\t ', 's', '\t'])).toMatch(
        /^cockle-config stdin $/
      );
    });

    test('should append space to a complete matching subcommand', async ({ page }) => {
      expect(
        await shellInputsSimple(page, ['c', 'o', '\t ', 's', 't', 'd', 'i', 'n', '\t'])
      ).toMatch(/^cockle-config stdin $/);
    });

    test('should leave unchanged if no matching subcommand', async ({ page }) => {
      expect(await shellInputsSimple(page, ['c', 'o', '\t ', 'x', '\t'])).toMatch(
        /^cockle-config x$/
      );
    });

    test('should match stdin subcommand string options', async ({ page }) => {
      expect(await shellInputsSimple(page, ['c', 'o', '\t ', 's', 't', '\t', '\t'])).toMatch(
        /^cockle-config stdin s$/
      );

      expect(await shellInputsSimple(page, ['c', 'o', '\t ', 's', 't', '\t', 's', '\t'])).toMatch(
        /^cockle-config stdin s\r\nsab {2}sw\r\n/
      );

      expect(
        await shellInputsSimple(page, ['c', 'o', '\t ', 's', 't', '\t', 's', 'w', '\t'])
      ).toMatch(/^cockle-config stdin sw $/);

      expect(
        await shellInputsSimple(page, ['c', 'o', '\t ', 's', 't', '\t', 's', 'a', '\t'])
      ).toMatch(/^cockle-config stdin sab $/);
    });

    test('should match command subcommand string options', async ({ page }) => {
      expect(await shellInputsSimple(page, ['c', 'o', '\t ', 'c', '\t', 'j', '\t'])).toMatch(
        /^cockle-config command j\r\njoin {5}js-tab {3}js-test\r\n/
      );

      expect(
        await shellInputsSimple(page, ['c', 'o', '\t ', 'c', '\t', 'j', 's', '-', 't', 'e', '\t'])
      ).toMatch(/^cockle-config command js-test $/);
    });

    test('should match module subcommand string options', async ({ page }) => {
      expect(await shellInputsSimple(page, ['c', 'o', '\t ', 'm', '\t', 'w', '\t'])).toMatch(
        /^cockle-config module wasm-test $/
      );
    });

    test('should match package subcommand string options', async ({ page }) => {
      expect(await shellInputsSimple(page, ['c', 'o', '\t ', 'p', '\t', 'u', '\t'])).toMatch(
        /^cockle-config package util-$/
      );

      expect(
        await shellInputsSimple(page, ['c', 'o', '\t ', 'p', '\t', 'u', '\t', 'w', '\t'])
      ).toMatch(/^cockle-config package util-wasm $/);
    });

    test('should show -- options', async ({ page }) => {
      expect(await shellInputsSimple(page, ['c', 'o', '\t ', '-', '-', '\t'])).toMatch(
        /^cockle-config --\r\n--help {5}--version\r\n/
      );
    });

    test('should match a -- option', async ({ page }) => {
      expect(await shellInputsSimple(page, ['c', 'o', '\t ', '-', '-', 'v', '\t'])).toMatch(
        /^cockle-config --version $/
      );
    });

    test('should show - options', async ({ page }) => {
      expect(await shellInputsSimple(page, ['c', 'o', '\t ', '-', '\t'])).toMatch(
        /^cockle-config -\r\n--help {5}--version {2}-h {9}-v\r\n/
      );
    });

    test('should match a - option', async ({ page }) => {
      expect(await shellInputsSimple(page, ['c', 'o', '\t ', '-', 'h', '\t'])).toMatch(
        /^cockle-config -h $/
      );
    });
  });
});
