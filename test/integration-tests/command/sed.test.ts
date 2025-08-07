import { expect } from '@playwright/test';
import { test } from '../utils';

test.describe('sed command', () => {
  test('should run successfully', async ({ page }) => {
    const output = await page.evaluate(async () => {
      const { output, shell } = await globalThis.cockle.shellSetupSimple();
      await shell.inputLine('sed s/e/E/g file2');
      return [output.text, await shell.exitCode()];
    });
    expect(output[0]).toMatch('sed s/e/E/g file2\r\nSomE othEr filE\r\nSEcond linE\r\n');
    expect(output[1]).toEqual(0);
  });

  test('should modify in place', async ({ page }) => {
    const output = await page.evaluate(async () => {
      const { output, shell } = await globalThis.cockle.shellSetupSimple();
      await shell.inputLine('cat file2');
      const text0 = output.textAndClear();
      await shell.inputLine('sed -i s/e/XX/g file2');
      const exitCode1 = await shell.exitCode();
      output.clear();
      await shell.inputLine('cat file2');
      const text2 = output.textAndClear();
      return [text0, exitCode1, text2];
    });
    expect(output[0]).toMatch('cat file2\r\nSome other file\r\nSecond line\r\n');
    expect(output[1]).toEqual(0);
    expect(output[2]).toMatch('cat file2\r\nSomXX othXXr filXX\r\nSXXcond linXX\r\n');
  });

  test('should error on unknown argument', async ({ page }) => {
    const output = await page.evaluate(async () => {
      const { output, shell } = await globalThis.cockle.shellSetupEmpty();
      await shell.inputLine('sed -W');
      return [output.text, await shell.exitCode()];
    });
    expect(output[0]).toMatch('sed -W\r\nsed: unrecognized option: W\r\n');
    expect(output[1]).toEqual(1);
  });
});
