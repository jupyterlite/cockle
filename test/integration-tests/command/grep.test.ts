import { expect } from '@playwright/test';
import { shellLineSimple, shellLineSimpleN, test } from '../utils';

test.describe('grep command', () => {
  test('should write to stdout', async ({ page }) => {
    const output = await shellLineSimple(page, 'grep cond file2');
    expect(output).toMatch(/^grep cond file2\r\nSecond line\r\n/);
  });

  test('should support ^ and $', async ({ page }) => {
    const options = { initialFiles: { file3: ' hello\nhello ' } };
    const output = await shellLineSimpleN(
      page,
      ['grep hello file3', 'grep ^hello file3', 'grep hello$ file3'],
      options
    );
    expect(output[0]).toMatch(/^grep hello file3\r\n hello\r\nhello \r\n/);
    expect(output[1]).toMatch(/^grep \^hello file3\r\nhello \r\n/);
    expect(output[2]).toMatch(/^grep hello\$ file3\r\n hello\r\n/);
  });
});
