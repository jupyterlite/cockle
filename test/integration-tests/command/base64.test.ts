import { expect } from '@playwright/test';
import { shellLineSimple, shellLineSimpleN, test } from '../utils';

test.describe('base64 command', () => {
  test('should write to stdout', async ({ page }) => {
    expect(await shellLineSimple(page, 'base64 --version')).toMatch(
      /\r\nbase64 \(GNU coreutils\) \d+\.\d+\r\n/
    );
  });

  test('should encode named file', async ({ page }) => {
    expect(await shellLineSimple(page, 'base64 file1')).toMatch(
      '\r\nQ29udGVudHMgb2YgdGhlIGZpbGU=\r\n'
    );
  });

  test('should encode redirected input', async ({ page }) => {
    expect(await shellLineSimple(page, 'base64 < file1')).toMatch(
      '\r\nQ29udGVudHMgb2YgdGhlIGZpbGU=\r\n'
    );
  });

  test('should encode input from pipe', async ({ page }) => {
    expect(await shellLineSimple(page, 'cat file2 | base64')).toMatch(
      '\r\nU29tZSBvdGhlciBmaWxlClNlY29uZCBsaW5l\r\n'
    );
  });

  test('should wrap encoded output', async ({ page }) => {
    expect(await shellLineSimple(page, 'base64 -w 5 file1')).toMatch(
      '\r\nQ29ud\r\nGVudH\r\nMgb2Y\r\ngdGhl\r\nIGZpb\r\nGU=\r\n'
    );
  });

  test('should decode named file', async ({ page }) => {
    const output = await shellLineSimpleN(page, ['base64 file1 > f.b64', 'base64 -d f.b64']);
    expect(output[1]).toMatch('\r\nContents of the file\r\n');
  });

  test('should decode redirected input', async ({ page }) => {
    const output = await shellLineSimpleN(page, ['base64 file1 > f.b64', 'base64 -d < f.b64']);
    expect(output[1]).toMatch('\r\nContents of the file\r\n');
  });

  test('should decode ignoring garbage', async ({ page }) => {
    expect(await shellLineSimple(page, 'echo "T!W@F#u" | base64 -di')).toMatch('\r\nMan\r\n');
  });

  test('should error on invalid input', async ({ page }) => {
    const output = await page.evaluate(async () => {
      const { shell, output } = await globalThis.cockle.shellSetupSimple();
      await shell.inputLine('echo "T!W@F#u" | base64 -d');
      return [await shell.exitCode(), output.textAndClear()];
    });
    expect(output[0]).toBe(1);
    expect(output[1]).toMatch(/\r\nbase64: invalid input\r\n/);
  });

  test('should error on unknown file', async ({ page }) => {
    const output = await page.evaluate(async () => {
      const { shell, output } = await globalThis.cockle.shellSetupSimple();
      await shell.inputLine('base64 missing.txt');
      return [await shell.exitCode(), output.textAndClear()];
    });
    expect(output[0]).toBe(1);
    expect(output[1]).toMatch(/\r\nbase64: missing\.txt: No such file or directory\r\n/);
  });

  test('should error on unknown option', async ({ page }) => {
    const output = await page.evaluate(async () => {
      const { shell, output } = await globalThis.cockle.shellSetupSimple();
      await shell.inputLine('base64 -Z file1');
      return [await shell.exitCode(), output.textAndClear()];
    });
    expect(output[0]).toBe(1);
    expect(output[1]).toMatch(/\r\nbase64: unrecognized option: Z\r\n/);
  });
});
