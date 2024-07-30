import { expect } from '@playwright/test';
import {
  shellInputsSimple,
  shellInputsSimpleN,
  shellRunSimple,
  shellRunSimpleN,
  test
} from './utils';

test.describe('Shell', () => {
  test.describe('_runCommands', () => {
    test('should run ls command', async ({ page }) => {
      expect(await shellRunSimple(page, 'ls')).toEqual('dirA  file1  file2\r\n');
    });

    test('should run ls command with leading whitespace', async ({ page }) => {
      expect(await shellRunSimple(page, '   ls')).toEqual('dirA  file1  file2\r\n');
    });

    test('should output redirect to file', async ({ page }) => {
      const output = await page.evaluate(async () => {
        const { shell, FS } = await globalThis.cockle.shell_setup_simple();
        await shell._runCommands('echo Hello > out');
        const file1 = FS.readFile('out', { encoding: 'utf8' });

        await shell._runCommands('echo Goodbye >> out');
        const file2 = FS.readFile('out', { encoding: 'utf8' });
        return { file1, file2 };
      });
      expect(output.file1).toEqual('Hello\n');
      expect(output.file2).toEqual('Hello\nGoodbye\n');
    });

    test('should input redirect from file', async ({ page }) => {
      expect(await shellRunSimple(page, 'wc < file2')).toEqual('      1       5      27\r\n');
    });

    test('should support pipe', async ({ page }) => {
      const output = await shellRunSimpleN(page, ['ls -1|sort -r', 'ls -1|sort -r|uniq -c']);
      expect(output).toEqual([
        'file2\r\nfile1\r\ndirA\r\n',
        '      1 file2\r\n      1 file1\r\n      1 dirA\r\n'
      ]);
    });

    test('should support terminal stdin', async ({ page }) => {
      const [output, mockStdin] = await page.evaluate(async () => {
        const mockStdin = new globalThis.cockle.MockTerminalStdin();
        const { shell, output } = await globalThis.cockle.shell_setup_empty({
          stdinCallback: mockStdin.stdinCallback.bind(mockStdin),
          enableBufferedStdinCallback: mockStdin.enableBufferedStdinCallback.bind(mockStdin)
        });
        await shell._runCommands('wc');
        return [output.text, mockStdin];
      });
      expect(output).toEqual('      0       2       5\r\n');
      expect(mockStdin.callCount).toEqual(6);
      expect(mockStdin.enableCallCount).toEqual(1);
      expect(mockStdin.disableCallCount).toEqual(1);
    });

    test('should support quotes', async ({ page }) => {
      expect(await shellRunSimple(page, 'echo "Hello    x;   yz"')).toEqual('Hello    x;   yz\r\n');
    });

    test('should set $? (exit code)', async ({ page }) => {
      const { exitCodes, outputs } = await page.evaluate(async () => {
        const { shell, output } = await globalThis.cockle.shell_setup_simple();
        const { environment } = shell;
        const exitCodes: (number | null)[] = [];
        const outputs: string[] = [];

        // WASM command success.
        await shell._runCommands('ls unknown');
        exitCodes.push(environment.getNumber('?'));

        // WASM command error.
        await shell._runCommands('ls file2');
        exitCodes.push(environment.getNumber('?'));

        // Built-in command success.
        await shell._runCommands('cd unknown');
        exitCodes.push(environment.getNumber('?'));

        // Built-in command error.
        await shell._runCommands('cd dirA');
        exitCodes.push(environment.getNumber('?'));

        // Parse error.
        await shell._runCommands('ls "blah ');
        exitCodes.push(environment.getNumber('?'));

        // Command does not exist.
        await shell._runCommands('abcde');
        exitCodes.push(environment.getNumber('?'));

        // Multiple commands success.
        output.clear();
        await shell._runCommands('echo Hello; pwd');
        exitCodes.push(environment.getNumber('?'));
        outputs.push(output.text);

        // Multiple commands failure.
        output.clear();
        await shell._runCommands('cd a b; pwd');
        exitCodes.push(environment.getNumber('?'));
        outputs.push(output.text);

        return { exitCodes, outputs };
      });
      expect(exitCodes).toEqual([2, 0, 1, 0, 1, 127, 0, 1]);
      expect(outputs[0]).toEqual('Hello\r\n/drive/dirA\r\n');
      expect(outputs[1]).toMatch(/Error: cd: too many arguments/);
    });
  });

  test.describe('input', () => {
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
      expect(await shellInputsSimple(page, ['e', '\t'])).toMatch(/^e\r\necho {2}env {2}expr\r\n/);
    });

    test('should do nothing on unknown command', async ({ page }) => {
      expect(await shellInputsSimple(page, ['u', 'n', 'k', '\t'])).toEqual('unk');
    });

    test('should arrange in columns', async ({ page }) => {
      const output = await page.evaluate(async () => {
        const { shell, output } = await globalThis.cockle.shell_setup_empty();
        await shell.setSize(40, 10);
        await shell.inputs(['t', '\t']);
        const ret0 = output.text;
        output.clear();

        await shell.setSize(40, 20);
        await shell.inputs(['\t']);
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
      expect(output).toMatch(/^ls \/drive\/\r\nfile1 {2}file2 {2}dirA/);
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
      expect(output).toMatch(/^ls \/drive\r\nfile1 {2}file2 {2}dirA/);
      expect(output).toMatch(/ls \/drive\/$/);
    });

    test('should support . for current directory', async ({ page }) => {
      const output = await shellInputsSimple(page, ['l', 's', ' ', '.', '\t']);
      expect(output).toMatch(/^ls .\r\n.\/ {2}..\//);
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
      const output = await page.evaluate(async () => {
        const { shell, output, FS } = await globalThis.cockle.shell_setup_simple();
        FS.mkdir('.adir');
        FS.writeFile('.afile1', '');
        FS.writeFile('.afile2', '');
        await shell.inputs(['l', 's', ' ', '.', '\t']);
        const ret = [output.text];
        output.clear();

        await shell.inputs(['l', 's', ' ', '.', 'a', '\t']);
        ret.push(output.text);
        output.clear();

        await shell.inputs(['l', 's', ' ', '.', 'a', 'f', '\t']);
        ret.push(output.text);
        return ret;
      });
      expect(output[0]).toMatch(/^ls .\r\n.\/ {2}..\/ {2}.adir\/ {2}.afile1 {2}.afile2\r\n/);
      expect(output[1]).toMatch(/^ls .a\r\n.adir\/ {2}.afile1 {2}.afile2\r\n/);
      expect(output[2]).toEqual('ls .afile');
    });
  });

  test.describe('setSize', () => {
    test('should set envVars', async ({ page }) => {
      const output = await page.evaluate(async () => {
        const { shell } = await globalThis.cockle.shell_setup_empty();
        const { environment } = shell;
        const ret: object = {};
        await shell.setSize(10, 44);
        ret['LINES0'] = environment.getNumber('LINES');
        ret['COLUMNS0'] = environment.getNumber('COLUMNS');

        await shell.setSize(0, 45);
        ret['LINES1'] = environment.getNumber('LINES');
        ret['COLUMNS1'] = environment.getNumber('COLUMNS');

        await shell.setSize(14, -1);
        ret['LINES2'] = environment.getNumber('LINES');
        ret['COLUMNS2'] = environment.getNumber('COLUMNS');
        return ret;
      });
      expect(output['LINES0']).toEqual(10);
      expect(output['COLUMNS0']).toEqual(44);

      expect(output['LINES1']).toBeNull();
      expect(output['COLUMNS1']).toEqual(45);

      expect(output['LINES2']).toEqual(14);
      expect(output['COLUMNS2']).toBeNull();
    });
  });
});
