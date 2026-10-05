import { joinURL, wordAtCursor } from '../../src/utils';

describe('wordAtCursor', () => {
  test('should return the whole word when the cursor is at the end of the text', () => {
    expect(wordAtCursor('ls file1', 8)).toEqual([3, 8]);
  });

  test('should return the whole word when the cursor is in the middle of the word', () => {
    expect(wordAtCursor('ls file1', 5)).toEqual([3, 8]);
  });

  test('should return the whole word when the cursor is at the start of the word', () => {
    expect(wordAtCursor('ls file1', 3)).toEqual([3, 8]);
  });

  test('should return an empty word when the cursor is at the end of the text after a space', () => {
    expect(wordAtCursor('ls ', 3)).toEqual([3, 3]);
  });

  test('should treat command separators and redirection as delimiters', () => {
    expect(wordAtCursor('echo abc;cd', 8)).toEqual([5, 8]);
    expect(wordAtCursor('ls a|b', 4)).toEqual([3, 4]);
  });
});

describe('joinURL', () => {
  test('should should use just one slash between baseUrl and path', () => {
    const expected = 'http://localhost/path';
    expect(joinURL('http://localhost', 'path')).toEqual(expected);
    expect(joinURL('http://localhost/', 'path')).toEqual(expected);
    expect(joinURL('http://localhost//', 'path')).toEqual(expected);
    expect(joinURL('http://localhost', '/path')).toEqual(expected);
    expect(joinURL('http://localhost', '//path')).toEqual(expected);
    expect(joinURL('http://localhost/', '/path')).toEqual(expected);
    expect(joinURL('http://localhost//', '/path')).toEqual(expected);
    expect(joinURL('http://localhost/', '//path')).toEqual(expected);
    expect(joinURL('http://localhost//', '//path')).toEqual(expected);
  });
});
