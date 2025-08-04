import { expect } from '@playwright/test';
import { test, shellLineSimple } from './utils';

test.describe('built-in commands help coverage', () => {
  test('every built-in command has --help output', async ({ page }) => {
    // Get list of built-ins from `help`
    const helpOutput = await shellLineSimple(page, 'help');
    const builtins = helpOutput
      .split('\n')
      .map(l => l.trim())
      .filter(l => l && !l.startsWith('Built-in commands:') && !l.startsWith('For detailed help'))
      .map(l => l.replace(/^[-\s]+/, ''))
      .filter(cmd => cmd !== 'help'); // avoid recursion

    expect(builtins.length).toBeGreaterThan(0);

    // Run all commands in parallel with timeout
    await Promise.all(
      builtins.map(async cmd => {
        const output = await Promise.race([
          shellLineSimple(page, `${cmd} --help`),
          new Promise<string>((_, reject) =>
            setTimeout(() => reject(new Error(`${cmd} --help timed out`)), 2000)
          )
        ]);
        expect(output, `${cmd} --help should produce output`).toMatch(/\S/);
        expect(output, `${cmd} --help should mention -h`).toMatch(/-h/);
      })
    );
  });
});
