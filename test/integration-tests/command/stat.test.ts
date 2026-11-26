import { expect } from '@playwright/test';
import { shellLineSimple, shellLineSimpleN, test } from '../utils';

test.describe('stat command', () => {
  test('should report terminal stdin as character special file', async ({ page }) => {
    const output = await shellLineSimple(page, 'stat -c %F -');
    expect(output).toMatch('stat -c %F -\r\ncharacter special file\r\n');
  });

  test('should report error and exit status for missing file', async ({ page }) => {
    const output = await shellLineSimpleN(page, ['stat nosuchfile', 'echo $?']);
    expect(output[0]).toMatch(/stat: cannot statx? .nosuchfile.: No such file or directory/);
    expect(output[1]).toMatch('echo $?\r\n1\r\n');
  });

  test('should report stdin from pipe as fifo', async ({ page }) => {
    const output = await shellLineSimple(page, 'echo abc | stat -c %F -');
    expect(output).toMatch('echo abc | stat -c %F -\r\nfifo\r\n');
  });

  test('should report stdin from file as fifo', async ({ page }) => {
    const output = await shellLineSimple(page, 'stat -c %F - < file2');
    expect(output).toMatch('stat -c %F - < file2\r\nfifo\r\n');
  });

  test('should report stdout to pipe as fifo', async ({ page }) => {
    const output = await shellLineSimple(page, 'stat -c %F /dev/stdout | cat');
    expect(output).toMatch('stat -c %F /dev/stdout | cat\r\nfifo\r\n');
  });

  test('should report stdout to file as fifo', async ({ page }) => {
    const output = await shellLineSimpleN(page, [
      'stat -c %F /dev/stdout > out.txt',
      'cat out.txt'
    ]);
    expect(output[1]).toMatch('cat out.txt\r\nfifo\r\n');
  });

  test('should report stderr to file as fifo', async ({ page }) => {
    const output = await shellLineSimple(page, 'stat -c %F /dev/stderr 2> err.txt');
    expect(output).toMatch('stat -c %F /dev/stderr 2> err.txt\r\nfifo\r\n');
  });
});
