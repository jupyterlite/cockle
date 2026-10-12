import { expect } from '@playwright/test';
import { shellLineSimple, shellLineSimpleN, test } from '../utils';

test.describe('base32 command', () => {
  test('should write to stdout', async ({ page }) => {
    expect(await shellLineSimple(page, 'base32 --version')).toMatch(
      /\r\nbase32 \(GNU coreutils\) \d+\.\d+\r\n/
    );
  });

  test('should encode named file', async ({ page }) => {
    expect(await shellLineSimple(page, 'base32 file1')).toMatch(
      '\r\nINXW45DFNZ2HGIDPMYQHI2DFEBTGS3DF\r\n'
    );
  });

  test('should encode redirected input', async ({ page }) => {
    expect(await shellLineSimple(page, 'base32 < file1')).toMatch(
      '\r\nINXW45DFNZ2HGIDPMYQHI2DFEBTGS3DF\r\n'
    );
  });

  test('should encode input from pipe', async ({ page }) => {
    expect(await shellLineSimple(page, 'cat file2 | base32')).toMatch(
      '\r\nKNXW2ZJAN52GQZLSEBTGS3DFBJJWKY3PNZSCA3DJNZSQ====\r\n'
    );
  });

  test('should wrap encoded output', async ({ page }) => {
    expect(await shellLineSimple(page, 'base32 -w 8 file1')).toMatch(
      '\r\nINXW45DF\r\nNZ2HGIDP\r\nMYQHI2DF\r\nEBTGS3DF\r\n'
    );
  });

  test('should decode named file', async ({ page }) => {
    const output = await shellLineSimpleN(page, ['base32 file1 > f.b32', 'base32 -d f.b32']);
    expect(output[1]).toMatch('\r\nContents of the file\r\n');
  });

  test('should decode redirected input', async ({ page }) => {
    const output = await shellLineSimpleN(page, ['base32 file1 > f.b32', 'base32 -d < f.b32']);
    expect(output[1]).toMatch('\r\nContents of the file\r\n');
  });

  test('should decode ignoring garbage', async ({ page }) => {
    expect(
      await shellLineSimple(page, 'echo "INXW!45DFNZ2HGIDPMYQHI2DFEBTGS3DF" | base32 -di')
    ).toMatch('\r\nContents of the file\r\n');
  });

  test('should error on invalid input', async ({ page }) => {
    const output = await page.evaluate(async () => {
      const { shell, output } = await globalThis.cockle.shellSetupSimple();
      await shell.inputLine('base32 -d file1');
      return [await shell.exitCode(), output.textAndClear()];
    });
    expect(output[0]).toBe(1);
    expect(output[1]).toMatch(/\r\nbase32: invalid input\r\n/);
  });

  test('should error on unknown file', async ({ page }) => {
    const output = await page.evaluate(async () => {
      const { shell, output } = await globalThis.cockle.shellSetupSimple();
      await shell.inputLine('base32 missing.txt');
      return [await shell.exitCode(), output.textAndClear()];
    });
    expect(output[0]).toBe(1);
    expect(output[1]).toMatch(/\r\nbase32: missing\.txt: No such file or directory\r\n/);
  });

  test('should error on unknown option', async ({ page }) => {
    const output = await page.evaluate(async () => {
      const { shell, output } = await globalThis.cockle.shellSetupSimple();
      await shell.inputLine('base32 -Z file1');
      return [await shell.exitCode(), output.textAndClear()];
    });
    expect(output[0]).toBe(1);
    expect(output[1]).toMatch(/\r\nbase32: unrecognized option: Z\r\n/);
  });
});
