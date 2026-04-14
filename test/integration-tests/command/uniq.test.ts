import { expect } from '@playwright/test';
import { test } from '../utils';

test.describe('uniq command', () => {
  test('should write to stdout', async ({ page }) => {
    const output = await page.evaluate(async () => {
      const { shell, output } = await globalThis.cockle.shellSetupSimple();
      await shell.inputLine('uniq --version');
      return [await shell.exitCode(), output.textAndClear()];
    });
    expect(output[0]).toBe(0);
    expect(output[1]).toMatch(/\r\nuniq \(GNU coreutils\) \d+\.\d+\r\n/);
  });

  test('should redirect from stdin', async ({ page }) => {
    const output = await page.evaluate(async () => {
      const { shell, output } = await globalThis.cockle.shellSetupSimple();
      await shell.inputLine('uniq -c < file2');
      return [await shell.exitCode(), output.textAndClear()];
    });
    expect(output[0]).toBe(0);
    expect(output[1]).toMatch('\r\n      1 Some other file\r\n      1 Second line\r\n');
  });

  test('should read from pipe', async ({ page }) => {
    const output = await page.evaluate(async () => {
      const { shell, output } = await globalThis.cockle.shellSetupSimple();
      await shell.inputLine('cat file2 | uniq');
      return [await shell.exitCode(), output.textAndClear()];
    });
    expect(output[0]).toBe(0);
    expect(output[1]).toMatch('\r\nSome other file\r\nSecond line\r\n');
  });

  test('should read from pipe with counts', async ({ page }) => {
    const output = await page.evaluate(async () => {
      const { shell, output } = await globalThis.cockle.shellSetupSimple();
      await shell.inputLine('cat file2 | uniq -c');
      return [await shell.exitCode(), output.textAndClear()];
    });
    expect(output[0]).toBe(0);
    expect(output[1]).toMatch('\r\n      1 Some other file\r\n      1 Second line\r\n');
  });

  test('should read from named file', async ({ page }) => {
    const output = await page.evaluate(async () => {
      const { shell, output } = await globalThis.cockle.shellSetupSimple();
      await shell.inputLine('uniq -c file2');
      return [await shell.exitCode(), output.textAndClear()];
    });
    expect(output[0]).toBe(0);
    expect(output[1]).toMatch('\r\n      1 Some other file\r\n      1 Second line\r\n');
  });

  test('should error on unknown file', async ({ page }) => {
    const output = await page.evaluate(async () => {
      const { shell, output } = await globalThis.cockle.shellSetupSimple();
      await shell.inputLine('uniq -c unknown');
      return [await shell.exitCode(), output.textAndClear()];
    });
    expect(output[0]).toBe(1);
    expect(output[1]).toMatch('\r\nuniq: unknown: No such file or directory\r\n');
  });

  test('should read from and write to named files', async ({ page }) => {
    const output = await page.evaluate(async () => {
      const { shell, output } = await globalThis.cockle.shellSetupSimple();
      await shell.inputLine('uniq file2 outfile');
      const ret = [await shell.exitCode(), output.textAndClear()];

      await shell.inputLine('cat outfile');
      ret.push(await shell.exitCode(), output.textAndClear());
      return ret;
    });
    expect(output[0]).toBe(0);
    expect(output[2]).toBe(0);
    expect(output[3]).toMatch('\r\nSome other file\r\nSecond line\r\n');
  });

  test('should read from and write to named files with counts', async ({ page }) => {
    const output = await page.evaluate(async () => {
      const { shell, output } = await globalThis.cockle.shellSetupSimple();
      await shell.inputLine('uniq -c file2 outfile');
      const ret = [await shell.exitCode(), output.textAndClear()];

      await shell.inputLine('cat outfile');
      ret.push(await shell.exitCode(), output.textAndClear());
      return ret;
    });
    expect(output[0]).toBe(0);
    expect(output[2]).toBe(0);
    expect(output[3]).toMatch('\r\n      1 Some other file\r\n      1 Second line\r\n');
  });

  test('should read from named file and output redirect', async ({ page }) => {
    const output = await page.evaluate(async () => {
      const { shell, output } = await globalThis.cockle.shellSetupSimple();
      await shell.inputLine('uniq file2 > outfile');
      const ret = [await shell.exitCode(), output.textAndClear()];

      await shell.inputLine('cat outfile');
      ret.push(await shell.exitCode(), output.textAndClear());
      return ret;
    });
    expect(output[0]).toBe(0);
    expect(output[2]).toBe(0);
    expect(output[3]).toMatch('\r\nSome other file\r\nSecond line\r\n');
  });

  test('should read from and output redirect with counts', async ({ page }) => {
    const output = await page.evaluate(async () => {
      const { shell, output } = await globalThis.cockle.shellSetupSimple();
      await shell.inputLine('uniq -c file2 > outfile');
      const ret = [await shell.exitCode(), output.textAndClear()];

      await shell.inputLine('cat outfile');
      ret.push(await shell.exitCode(), output.textAndClear());
      return ret;
    });
    expect(output[0]).toBe(0);
    expect(output[2]).toBe(0);
    expect(output[3]).toMatch('\r\n      1 Some other file\r\n      1 Second line\r\n');
  });
});
