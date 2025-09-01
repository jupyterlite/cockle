import { expect } from '@playwright/test';
import { shellLineSimple, test } from '../utils';

test.describe('built-in commands help coverage', () => {
  test('every built-in command has --help output', async ({ page }) => {
    // Get list of built-ins from `cockle-config command --builtin`
    const output = await shellLineSimple(page, 'cockle-config command --builtin');
    const builtins = output
      .split('\r\n')
      .slice(4, -2) // Remove table header and footer.
      .map(x => x.split('│').at(1)?.trim()); // Take first column.

    expect(builtins.length).toEqual(11);

    // Run each built-in command sequentially to check `--help` output
    for (const cmd of builtins) {
      const output = await shellLineSimple(page, `${cmd} --help`);
      expect(output, `${cmd} --help should mention --help`).toMatch(/--help/);
      expect(output, `${cmd} --help should mention -h`).toMatch(/-h/);
    }
  });
});
