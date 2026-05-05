import { expect } from '@playwright/test';
import { shellLineSimple, test } from '../utils';

test.describe('du command', () => {
  test('should write version', async ({ page }) => {
    const output = await shellLineSimple(page, 'du --version');
    const lines = output.split('\r\n');
    expect(lines[1]).toMatch(/^du \(GNU coreutils\) \d+\.\d+$/);
  });

  test('should write to stdout', async ({ page }) => {
    const output = await shellLineSimple(page, 'du .');
    const lines = output.split('\r\n');
    expect(lines[1]).toMatch(/^1\s+\.\/dirA$/);
    expect(lines[2]).toMatch(/^2\s+\.$/);
  });
});
