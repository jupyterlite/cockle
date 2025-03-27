import { expect } from '@playwright/test';
import { shellLineSimpleN, test } from '../utils';

test.describe('sed command', () => {
  test('should write to stdout', async ({ page }) => {
    const output = await shellLineSimpleN(page, ['sed s/e/E/g file2', 'env | grep ?']);
    expect(output[0]).toMatch('sed s/e/E/g file2\r\nSomE othEr filE\r\nSEcond linE\r\n');
    expect(output[1]).toMatch('env | grep ?\r\n?=0\r\n');
  });

  test('should modify in place', async ({ page }) => {
    const output = await shellLineSimpleN(page, [
      'cat file2',
      'sed -i s/e/XX/g file2',
      'env | grep ?',
      'cat file2'
    ]);
    expect(output[0]).toMatch('cat file2\r\nSome other file\r\nSecond line\r\n');
    expect(output[2]).toMatch('env | grep ?\r\n?=0\r\n');
    expect(output[3]).toMatch('cat file2\r\nSomXX othXXr filXX\r\nSXXcond linXX\r\n');
  });

  test('should error on unknown argument', async ({ page }) => {
    const output = await shellLineSimpleN(page, ['sed -W', 'env | grep ?']);
    expect(output[0]).toMatch('sed -W\r\nsed: unrecognized option: W\r\n');
    expect(output[1]).toMatch('env | grep ?\r\n?=1\r\n');
  });
});
