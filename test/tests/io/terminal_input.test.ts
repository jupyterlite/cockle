import { expect } from '@playwright/test';
import { test } from '../utils';

test.describe('TerminalInput', () => {
  test('should return 4 (EOT) if no callback', async ({ page }) => {
    const charCodes = await page.evaluate(() => {
      const terminalInput = new globalThis.cockle.TerminalInput();
      const charCodes: number[][] = [];
      for (let i = 0; i < 5; i++) {
        charCodes.push(terminalInput.readChar());
      }
      return charCodes;
    });
    expect(charCodes).toEqual([[4], [4], [4], [4], [4]]);
  });

  test('should call callback one character at a time until EOT', async ({ page }) => {
    const output = await page.evaluate(() => {
      const mockStdin = new globalThis.cockle.MockTerminalStdin();
      const terminalInput = new globalThis.cockle.TerminalInput(
        mockStdin.stdinCallback.bind(mockStdin)
      );
      const charCodes: number[][] = [];
      for (let i = 0; i < 10; i++) {
        charCodes.push(terminalInput.readChar());
      }
      return { mockStdin, charCodes };
    });
    const { mockStdin, charCodes } = output;
    const expected = [90, 100, 122, 32, 100];
    expect(mockStdin.callCount).toEqual(6); // === expected.length + 1
    for (let i = 0; i < 10; i++) {
      if (i < expected.length) {
        expect(charCodes[i]).toEqual([expected[i]]);
      } else {
        // Once end of input file reached, always returns char code 4 (EOT).
        expect(charCodes[i]).toEqual([4]);
      }
    }
  });
});
