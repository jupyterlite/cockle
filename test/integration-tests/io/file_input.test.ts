/*
import { expect } from '@playwright/test';
import { test } from '../utils';

test.describe('FileInput', () => {
  test('should read from file', async ({ page }) => {
    const output = await page.evaluate(async () => {
      const { fileSystem } = await globalThis.cockle.shellSetupSimple();
      const fileInput = new globalThis.cockle.FileInput(fileSystem, 'file2');
      return fileInput.readAll();
    });
    expect(output).toEqual('Some other file\nSecond line');
  });

  test('should read from file a character at a time', async ({ page }) => {
    const charCodes = await page.evaluate(async () => {
      const { fileSystem } = await globalThis.cockle.shellSetupSimple();
      const fileInput = new globalThis.cockle.FileInput(fileSystem, 'file2');
      const ret: number[][] = [];
      for (let i = 0; i < 35; i++) {
        ret.push(fileInput.readChar());
      }
      return ret;
    });
    const expected = 'Some other file\nSecond line';
    for (let i = 0; i < 35; i++) {
      if (i < expected.length) {
        expect(charCodes[i]).toEqual([expected.charCodeAt(i)]);
      } else {
        // Once end of input file reached, always returns char code 4 (EOT).
        expect(charCodes[i]).toEqual([4]);
      }
    }
  });
});
*/
