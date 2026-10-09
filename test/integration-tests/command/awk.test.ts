import { expect } from '@playwright/test';
import { shellLineSimple, test } from '../utils';

test.describe('awk command', () => {
  test('should print each line', async ({ page }) => {
    const output = await shellLineSimple(page, "awk '{ print }' file2");
    expect(output).toMatch(/^awk '\{ print \}' file2\r\nSome other file\r\nSecond line\r\n/);
  });

  test('should print a field', async ({ page }) => {
    const output = await shellLineSimple(page, "awk '{ print $2 }' file2");
    expect(output).toMatch(/^awk '\{ print \$2 \}' file2\r\nother\r\nline\r\n/);
  });

  test('should print the field of matching lines', async ({ page }) => {
    const output = await shellLineSimple(page, "awk '/Second/ { print $1 }' file2");
    expect(output).toMatch(/^awk '\/Second\/ \{ print \$1 \}' file2\r\nSecond\r\n/);
  });

  test('should run a BEGIN block', async ({ page }) => {
    const output = await shellLineSimple(page, "awk 'BEGIN { print 2 + 3 }'");
    expect(output).toMatch(/^awk 'BEGIN \{ print 2 \+ 3 \}'\r\n5\r\n/);
  });

  test('should read from stdin', async ({ page }) => {
    const output = await shellLineSimple(page, "awk '{ print $1 }' < file2");
    expect(output).toMatch(/^awk '\{ print \$1 \}' < file2\r\nSome\r\nSecond\r\n/);
  });

  test('should read from pipe', async ({ page }) => {
    const output = await shellLineSimple(page, "cat file2 | awk '{ print $1 }'");
    expect(output).toMatch(/^cat file2 \| awk '\{ print \$1 \}'\r\nSome\r\nSecond\r\n/);
  });

  test('should report version', async ({ page }) => {
    const output = await page.evaluate(async () => {
      const { shell, output } = await globalThis.cockle.shellSetupSimple();
      await shell.inputLine('awk --version');
      return [await shell.exitCode(), output.textAndClear()];
    });
    expect(output[0]).toEqual(0);
    expect(output[1]).toMatch(/\r\nawk version \d+\r\n/);
  });

  test('should error on unknown file', async ({ page }) => {
    const output = await page.evaluate(async () => {
      const { shell, output } = await globalThis.cockle.shellSetupSimple();
      await shell.inputLine("awk '{ print }' nosuchfile");
      return [await shell.exitCode(), output.textAndClear()];
    });
    expect(output[0]).toEqual(2);
    expect(output[1]).toMatch(/\r\nawk: can't open file nosuchfile\r\n/);
  });
});
