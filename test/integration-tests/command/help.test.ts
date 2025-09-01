import { expect } from '@playwright/test';
import { shellLineSimple, test } from '../utils';

test.describe('built-in commands help coverage', () => {
  test('every built-in command has --help output', async ({ page }) => {
    // Get list of built-ins from `help`
    const helpOutput = await shellLineSimple(page, 'help');
    const builtins = helpOutput
      .split('\n')
      .filter(line => /^\s+\S/.test(line))
      .map(line => line.trim())
      .filter(cmd => cmd !== 'help');

    expect(builtins.length).toBeGreaterThan(0);

    // Run each built-in command sequentially to check `--help` output
    for (const cmd of builtins) {
      const output = await shellLineSimple(page, `${cmd} --help`);
      expect(output, `${cmd} --help should mention --help`).toMatch(/--help/);
      expect(output, `${cmd} --help should mention -h`).toMatch(/-h/);
    }
  });
});
