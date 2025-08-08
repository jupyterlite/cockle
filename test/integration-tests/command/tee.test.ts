import { expect } from '@playwright/test';
import { test } from '../utils';

test.describe('tee command', () => {
  test('should write to stdout and file', async ({ page }) => {
    const output = await page.evaluate(async () => {
      const { output, shell } = await globalThis.cockle.shellSetupSimple();
      await shell.inputLine('tee out.txt < file2');
      const text0 = output.textAndClear();
      const exitCode1 = await shell.exitCode();
      output.clear();
      await shell.inputLine('cat out.txt');
      const text2 = output.textAndClear();
      return [text0, exitCode1, text2];
    });
    expect(output[0]).toMatch('tee out.txt < file2\r\nSome other file\r\nSecond line\r\n');
    expect(output[1]).toEqual(0);
    expect(output[2]).toMatch('cat out.txt\r\nSome other file\r\nSecond line\r\n');
  });

  test('should write to stdout and append to file', async ({ page }) => {
    const output = await page.evaluate(async () => {
      const { output, shell } = await globalThis.cockle.shellSetupSimple();
      await shell.inputLine('cat file1');
      const text0 = output.textAndClear();
      await shell.inputLine('tee -a file1 < file2');
      const exitCode1 = await shell.exitCode();
      output.clear();
      await shell.inputLine('cat file1');
      const text2 = output.textAndClear();
      return [text0, exitCode1, text2];
    });
    expect(output[0]).toMatch('cat file1\r\nContents of the file\r\n');
    expect(output[1]).toEqual(0);
    expect(output[2]).toMatch(
      'cat file1\r\nContents of the fileSome other file\r\nSecond line\r\n'
    );
  });

  test('should error on unknown argument', async ({ page }) => {
    const output = await page.evaluate(async () => {
      const { output, shell } = await globalThis.cockle.shellSetupEmpty();
      await shell.inputLine('tee -x');
      return [output.text, await shell.exitCode()];
    });
    expect(output[0]).toMatch("tee -x\r\ntee: invalid option -- 'x'\r\n");
    expect(output[1]).toEqual(1);
  });
});
