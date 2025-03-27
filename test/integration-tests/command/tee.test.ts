import { expect } from '@playwright/test';
import { shellLineSimpleN, test } from '../utils';

test.describe('tee command', () => {
  test('should write to stdout and file', async ({ page }) => {
    const output = await shellLineSimpleN(page, [
      'tee out.txt < file2',
      'env | grep ?',
      'cat out.txt'
    ]);
    expect(output[0]).toMatch('tee out.txt < file2\r\nSome other file\r\nSecond line\r\n');
    expect(output[1]).toMatch('env | grep ?\r\n?=0\r\n');
    expect(output[2]).toMatch('cat out.txt\r\nSome other file\r\nSecond line\r\n');
  });

  test('should write to stdout and append to file', async ({ page }) => {
    const output = await shellLineSimpleN(page, [
      'cat file1',
      'tee -a file1 < file2',
      'env | grep ?',
      'cat file1'
    ]);
    expect(output[0]).toMatch('cat file1\r\nContents of the file\r\n');
    expect(output[1]).toMatch('tee -a file1 < file2\r\nSome other file\r\nSecond line\r\n');
    expect(output[2]).toMatch('env | grep ?\r\n?=0\r\n');
    expect(output[3]).toMatch(
      'cat file1\r\nContents of the fileSome other file\r\nSecond line\r\n'
    );
  });

  test('should error on unknown argument', async ({ page }) => {
    const output = await shellLineSimpleN(page, ['tee -x', 'env | grep ?']);
    expect(output[0]).toMatch("tee -x\r\ntee: invalid option -- 'x'\r\n");
    expect(output[1]).toMatch('env | grep ?\r\n?=1\r\n');
  });
});
