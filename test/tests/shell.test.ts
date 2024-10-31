import { expect } from '@playwright/test';
import {
  shellInputsSimple,
  shellInputsSimpleN,
  shellLineSimple,
  shellLineSimpleN,
  test
} from './utils';

const left = '\x1B[D';
const backspace = '\x7F';
const delete_ = '\x1B[3~';
const home = '\x1B[H';
const end = '\x1B[F';
const prev = '\x1B[1;2D';
const next = '\x1B[1;2C';

test.describe('Shell', () => {
  test.describe('run command', () => {
    test('should run ls command', async ({ page }) => {
      expect(await shellLineSimple(page, 'ls')).toMatch(/^ls\r\ndirA {2}file1 {2}file2\r\n/);
    });

    test('should run ls command with leading whitespace', async ({ page }) => {
      expect(await shellLineSimple(page, '   ls')).toMatch(/^ {3}ls\r\ndirA {2}file1 {2}file2\r\n/);
    });

    test('should output redirect to file', async ({ page }) => {
      const output = await shellLineSimpleN(page, [
        'echo Hello > out',
        'cat out',
        'wc out',
        'echo Goodbye >> out',
        'cat out',
        'wc out'
      ]);
      expect(output[1]).toMatch('\r\nHello\r\n');
      expect(output[2]).toMatch('\r\n1 1 6 out\r\n');
      expect(output[4]).toMatch('\r\nHello\r\nGoodbye\r\n');
      expect(output[5]).toMatch('\r\n 2  2 14 out\r\n');
    });

    test('should output redirect to file without ansi escapes', async ({ page }) => {
      // grep to terminal is colored
      const output_direct = await shellLineSimple(page, 'grep of file1', { color: true });
      const start = '\x1B[01;31m\x1B[K';
      const end = '\x1B[m\x1B[K';
      expect(output_direct).toMatch(`\r\nContents ${start}of${end} the file\r\n`);

      // grep to file is not colored
      const output_file = await shellLineSimpleN(page, ['grep of file1 > output', 'cat output'], {
        color: false
      });
      expect(output_file[1]).toMatch(/^cat output\r\nContents of the file\r\n/);
    });

    test('should input redirect from file', async ({ page }) => {
      expect(await shellLineSimple(page, 'wc < file2')).toMatch('      1       5      27\r\n');
    });

    test('should support pipe', async ({ page }) => {
      const output = await shellLineSimpleN(page, ['ls -1|sort -r', 'ls -1|sort -r|uniq -c']);
      expect(output[0]).toMatch('\r\nfile2\r\nfile1\r\ndirA\r\n');
      expect(output[1]).toMatch('\r\n      1 file2\r\n      1 file1\r\n      1 dirA\r\n');
    });

    test('should support terminal stdin', async ({ page }) => {
      const output = await page.evaluate(async () => {
        const { shell, output } = await globalThis.cockle.shell_setup_empty();
        const EOT = String.fromCharCode(4);
        await Promise.all([
          shell.inputLine('wc'),
          globalThis.cockle.terminalInput(shell, ['a', ' ', 'b', '\n', 'c', EOT])
        ]);
        return output.text;
      });
      expect(output).toMatch(/^wc\r\na b\r\nc {6}1 {7}3 {7}5\r\n/);
    });

    test('should support terminal stdin more than once', async ({ page }) => {
      const output = await page.evaluate(async () => {
        const { shell, output } = await globalThis.cockle.shell_setup_empty();
        const EOT = String.fromCharCode(4);
        await Promise.all([
          shell.inputLine('wc'),
          globalThis.cockle.terminalInput(shell, ['a', ' ', 'b', '\n', 'c', EOT])
        ]);
        const ret0 = output.text;
        output.clear();

        await Promise.all([
          shell.inputLine('wc'),
          globalThis.cockle.terminalInput(shell, ['d', 'e', ' ', 'f', EOT])
        ]);
        const ret1 = output.text;
        return [ret0, ret1];
      });
      expect(output[0]).toMatch(/^wc\r\na b\r\nc {6}1 {7}3 {7}5\r\n/);
      expect(output[1]).toMatch(/^wc\r\nde f {6}0 {7}2 {7}4\r\n/);
    });

    test('should support quotes', async ({ page }) => {
      const output = await shellLineSimple(page, 'echo "Hello    x;   yz"');
      expect(output).toMatch('\r\nHello    x;   yz\r\n');
    });

    test('should set $? (exit code)', async ({ page }) => {
      const output = await shellLineSimpleN(page, [
        // WASM command success.
        'ls unknown',
        'env|grep ?',
        // WASM command error.
        'ls file2',
        'env|grep ?',
        // Built-in command success.
        'cd unknown',
        'env|grep ?',
        // Built-in command error.
        'cd dirA',
        'env|grep ?',
        // Parse error.
        'ls "blah ',
        'env|grep ?',
        // Command does not exist.
        'abcde',
        'env|grep ?',
        // Multiple commands success.
        'echo Hello; pwd',
        'env|grep ?',
        // Multiple commands failure.
        'cd a b; pwd',
        'env|grep ?'
      ]);
      expect(output[1]).toMatch('\r\n?=2\r\n');
      expect(output[3]).toMatch('\r\n?=0\r\n');
      expect(output[5]).toMatch('\r\n?=1\r\n');
      expect(output[7]).toMatch('\r\n?=0\r\n');
      expect(output[9]).toMatch('\r\n?=1\r\n');
      expect(output[11]).toMatch('\r\n?=127\r\n');
      expect(output[12]).toMatch('\r\nHello\r\n/drive/dirA\r\n');
      expect(output[13]).toMatch('\r\n?=0\r\n');
      expect(output[14]).toMatch(/Error: cd: too many arguments/);
      expect(output[15]).toMatch('\r\n?=1\r\n');
    });
  });

  test.describe('echo input', () => {
    test('should echo input up to \\r', async ({ page }) => {
      expect(await shellInputsSimple(page, ['l', 's', ' ', '-', 'a', 'l'])).toEqual('ls -al');
    });

    test('should echo input and run ls command after \\r', async ({ page }) => {
      expect(await shellInputsSimple(page, ['l', 's', '\r'])).toMatch(
        /^ls\r\ndirA {2}file1 {2}file2\r\n/
      );
    });
  });

  test.describe('input tab complete commands', () => {
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
        /^e\r\necho {2}env {2}exit {2}export {2}expr\r\n/
      );
    });

    test('should do nothing on unknown command', async ({ page }) => {
      expect(await shellInputsSimple(page, ['u', 'n', 'k', '\t'])).toEqual('unk');
    });

    test('should arrange in columns', async ({ page }) => {
      const output = await page.evaluate(async () => {
        const { shell, output } = await globalThis.cockle.shell_setup_empty();
        await shell.setSize(40, 10);
        await shell.input('t');
        await shell.input('\t');
        const ret0 = output.text;
        output.clear();

        await shell.setSize(40, 20);
        await shell.input('\t');
        const ret1 = output.text;
        return [ret0, ret1];
      });
      expect(output[0]).toMatch(/^t\r\ntail\r\ntouch\r\ntr\r\ntty\r\n/);
      expect(output[1]).toMatch(/^\r\ntail {3}tr\r\ntouch {2}tty\r\n/);
    });

    test('should add common startsWith', async ({ page }) => {
      const output = await shellInputsSimpleN(page, [['s', 'h', '\t'], ['\t']]);
      expect(output[0]).toEqual('sha');
      expect(output[1]).toMatch(/sha1sum {2}sha224sum {2}sha256sum {2}sha384sum {2}sha512sum/);
    });

    test('should include aliases', async ({ page }) => {
      expect(await shellInputsSimple(page, ['l', '\t'])).toMatch(/^l\r\nll {2}ln {2}logname {2}ls/);
    });

    test('should complete within a command preserving suffix', async ({ page }) => {
      const output = await shellInputsSimpleN(page, [['e', 'c', 'X', left, '\t'], ['\r']]);
      expect(output[1]).toMatch(/^\r\nX\r\n/);
    });
  });

  test.describe('input tab complete filenames', () => {
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
      const output = await shellInputsSimple(page, ['l', 's', ' ', 'd', '\t']);
      expect(output).toEqual('ls dirA/');
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

    test('should list contents if match directory without trailing slash', async ({ page }) => {
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
        '\t'
      ]);
      expect(output).toMatch(/^ls \/drive\r\ndirA\/ {2}file1 {2}file2\r\n/);
      expect(output).toMatch(/ls \/drive\/$/);
    });

    test('should support . for current directory', async ({ page }) => {
      const output = await shellInputsSimple(page, ['l', 's', ' ', '.', '\t']);
      expect(output).toMatch(/^ls .\r\n.\/ {2}..\/\r\n/);
      expect(output).toMatch(/ls .$/);
    });

    test('should support . for current directory 2', async ({ page }) => {
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
      expect(output).toMatch(/^ls .\/file\r\nfile1 {2}file2\r\n/);
      expect(output).toMatch(/ls .\/file$/);
    });

    test('should support .. for parent directory', async ({ page }) => {
      const output = await shellInputsSimple(page, ['l', 's', ' ', '.', '.', '/', 'd', 'r', '\t']);
      expect(output).toEqual('ls ../drive/');
    });

    test('should show dot files/directories', async ({ page }) => {
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
      expect(output[0]).toMatch(/^ls .\r\n.\/ {2}..\/ {2}.adir\/ {2}.afile1 {2}.afile2\r\n/);
      expect(output[1]).toMatch(/^ls .a\r\n.adir\/ {2}.afile1 {2}.afile2\r\n/);
      expect(output[2]).toEqual('ls .afile');
    });
  });

  test.describe('setSize', () => {
    test('should set envVars', async ({ page }) => {
      const output = await page.evaluate(async () => {
        const { output, shell } = await globalThis.cockle.shell_setup_empty();
        const ret: string[] = [];
        await shell.setSize(10, 44);
        await shell.inputLine('env|grep LINES;env|grep COLUMNS');
        ret.push(output.text);

        output.clear();
        await shell.setSize(0, 45);
        await shell.inputLine('env|grep LINES;env|grep COLUMNS');
        ret.push(output.text);

        output.clear();
        await shell.setSize(14, -1);
        await shell.inputLine('env|grep LINES;env|grep COLUMNS');
        ret.push(output.text);
        return ret;
      });
      expect(output[0]).toMatch('\r\nLINES=10\r\nCOLUMNS=44\r\n');
      expect(output[1]).toMatch('\r\nCOLUMNS=45\r\n');
      expect(output[2]).toMatch('\r\nLINES=14\r\n');
    });
  });

  test.describe('command line editing', () => {
    // We can't explicitly check the cursor position without performing a visual test or decoding
    // the ANSI escape sequences, so here we use an echo command that will write to stdout and
    // insert an easily identified character at the cursor location.
    test('should delete forward and backward', async ({ page }) => {
      const common = ['e', 'c', 'h', 'o', ' ', 'A', 'B', 'C', 'D'];
      const output = await shellInputsSimpleN(page, [
        [...common, left, left, backspace, '\r'],
        [...common, left, left, delete_, '\r']
      ]);
      expect(output[0]).toMatch(/\r\nACD\r\n/);
      expect(output[1]).toMatch(/\r\nABD\r\n/);
    });

    test('should support home and end', async ({ page }) => {
      const common = ['c', 'h', 'o', ' ', 'A', 'B', 'C'];
      const output = await shellInputsSimpleN(page, [
        [...common, left, left, home, 'e', '\r'],
        ['e', ...common, left, left, end, 'D', '\r']
      ]);
      expect(output[0]).toMatch(/\r\nABC\r\n/);
      expect(output[1]).toMatch(/\r\nABCD\r\n/);
    });

    test('should support prev word', async ({ page }) => {
      const common = ['e', 'c', 'h', 'o', ' ', 'A', 'B', ' ', ' ', 'C', 'D'];
      const output = await shellInputsSimpleN(page, [
        [...common, prev, 'Z', '\r'],
        [...common, prev, prev, 'Y', '\r']
      ]);
      expect(output[0]).toMatch(/\r\nAB ZCD\r\n/);
      expect(output[1]).toMatch(/\r\nYAB CD\r\n/);
    });

    test('should support next word', async ({ page }) => {
      const common = ['e', 'c', 'h', 'o', ' ', 'A', 'B', ' ', ' ', 'C', 'D'];
      const output = await shellInputsSimpleN(page, [
        [...common, home, next, next, 'Z', '\r'],
        [...common, home, next, next, next, 'Y', '\r']
      ]);
      expect(output[0]).toMatch(/\r\nABZ CD\r\n/);
      expect(output[1]).toMatch(/\r\nAB CDY\r\n/);
    });
  });

  test.describe('dispose', () => {
    test('should set isDisposed', async ({ page }) => {
      const output = await page.evaluate(async () => {
        const { shell } = await globalThis.cockle.shell_setup_empty();
        const isDisposed0 = shell.isDisposed;
        shell.dispose();
        const isDisposed1 = shell.isDisposed;
        return { isDisposed0, isDisposed1 };
      });
      expect(output['isDisposed0']).toBeFalsy();
      expect(output['isDisposed1']).toBeTruthy();
    });

    test('should emit signal', async ({ page }) => {
      const output = await page.evaluate(async () => {
        const { shell } = await globalThis.cockle.shell_setup_empty();
        let signalled = false;
        shell.disposed.connect(() => {
          signalled = true;
        });
        const isDisposed0 = shell.isDisposed;
        shell.dispose();
        const isDisposed1 = shell.isDisposed;
        return { isDisposed0, isDisposed1, signalled };
      });
      expect(output['isDisposed0']).toBeFalsy();
      expect(output['isDisposed1']).toBeTruthy();
      expect(output['signalled']).toBeTruthy();
    });
  });
});
