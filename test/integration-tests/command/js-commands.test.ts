import { expect } from '@playwright/test';
import { shellLineSimple, shellLineSimpleN, test } from '../utils';

test.describe('js commands', () => {
  test.describe('js-test', () => {
    test('should write to stdout', async ({ page }) => {
      const output = await shellLineSimpleN(page, ['js-test ab c', 'env | grep ?']);
      expect(output[0]).toMatch('js-test ab c\r\njs-test: ab,c\r\n');
      expect(output[1]).toMatch('\r\n?=0\r\n');
    });
  });

  test.describe('js-capitalise', () => {
    test('should write to stdout', async ({ page }) => {
      const output = await shellLineSimpleN(page, ['js-capitalise ab c', 'env | grep ?']);
      expect(output[0]).toMatch('js-capitalise ab c\r\njs-capitalise: AB,C\r\n');
      expect(output[1]).toMatch('\r\n?=1\r\n');
    });
  });

  test.describe('multiple commands', () => {
    test('should run in order', async ({ page }) => {
      // Multiple commands should be loadable at the same time without affecting each other.
      const output = await shellLineSimpleN(page, [
        'js-test ab c',
        'js-capitalise ab c',
        'js-test x y',
        'js-capitalise x y'
      ]);
      expect(output[0]).toMatch('\r\njs-test: ab,c\r\n');
      expect(output[1]).toMatch('\r\njs-capitalise: AB,C\r\n');
      expect(output[2]).toMatch('\r\njs-test: x,y\r\n');
      expect(output[3]).toMatch('\r\njs-capitalise: X,Y\r\n');
    });
  });

  test.describe('js-read', () => {
    test('should read from keyboard', async ({ page }) => {
      const output = await page.evaluate(async () => {
        const { shell, output } = await globalThis.cockle.shellSetupEmpty();
        const { EOT } = globalThis.cockle.keys;
        await Promise.all([
          shell.inputLine('js-read'),
          globalThis.cockle.terminalInput(shell, ['a', 'B', '\n', 'c', EOT])
        ]);
        return output.text;
      });
      expect(output).toMatch(/^js-read\r\naABB\r\n\r\ncC\r\n/);
    });

    test('should read from pipe', async ({ page }) => {
      const output = await shellLineSimple(page, 'cat file2 | js-read');
      expect(output).toMatch(/^cat file2 | js-read\r\nSOME OTHER FILE\r\nSECOND LINE\r\n/);
    });

    test('should read from file', async ({ page }) => {
      const output = await shellLineSimple(page, 'js-read < file2');
      expect(output).toMatch(/^js-read < file2\r\nSOME OTHER FILE\r\nSECOND LINE\r\n/);
    });

    test('should output to file', async ({ page }) => {
      const output = await page.evaluate(async () => {
        const { shell, output } = await globalThis.cockle.shellSetupEmpty();
        const { EOT } = globalThis.cockle.keys;
        await Promise.all([
          shell.inputLine('js-read > out.txt'),
          globalThis.cockle.terminalInput(shell, ['a', 'B', '\n', 'c', EOT])
        ]);
        const output0 = output.textAndClear();
        await shell.inputLine('cat out.txt');
        return [output0, output.text];
      });
      expect(output[0]).toMatch(/^js-read > out.txt\r\naB\r\nc\r\n/);
      expect(output[1]).toMatch(/^cat out.txt\r\nAB\r\nC\r\n/);
    });
  });
});
