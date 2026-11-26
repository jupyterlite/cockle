import { nextCharIndex, prevCharIndex, stringWidth } from '../../src/char_width';

describe('stringWidth', () => {
  test('should be zero for an empty string', () => {
    expect(stringWidth('')).toEqual(0);
  });

  test('should count one column for each ASCII character', () => {
    expect(stringWidth('abc')).toEqual(3);
  });

  test('should count two columns for each emoji', () => {
    expect(stringWidth('🚀🚀')).toEqual(4);
    expect(stringWidth('a🚀b')).toEqual(4);
  });

  test('should count two columns for each wide character', () => {
    expect(stringWidth('日本')).toEqual(4);
  });

  test('should count no columns for a combining mark', () => {
    expect(stringWidth('é')).toEqual(1);
    expect(stringWidth('❤️')).toEqual(1);
  });
});

describe('prevCharIndex', () => {
  test('should not move before the start', () => {
    expect(prevCharIndex('', 0)).toEqual(0);
    expect(prevCharIndex('abc', 0)).toEqual(0);
  });

  test('should move over a surrogate pair as a whole', () => {
    const text = 'a🚀b';
    expect(prevCharIndex(text, 4)).toEqual(3);
    expect(prevCharIndex(text, 3)).toEqual(1);
    expect(prevCharIndex(text, 1)).toEqual(0);
  });

  test('should move over a character and its combining marks as a whole', () => {
    const text = 'x❤️y';
    expect(prevCharIndex(text, 4)).toEqual(3);
    expect(prevCharIndex(text, 3)).toEqual(1);
    expect(prevCharIndex(text, 1)).toEqual(0);
  });

  test('should move over a leading combining mark', () => {
    expect(prevCharIndex('́a', 1)).toEqual(0);
  });
});

describe('nextCharIndex', () => {
  test('should not move after the end', () => {
    expect(nextCharIndex('', 0)).toEqual(0);
    expect(nextCharIndex('abc', 3)).toEqual(3);
  });

  test('should move over a surrogate pair as a whole', () => {
    const text = 'a🚀b';
    expect(nextCharIndex(text, 0)).toEqual(1);
    expect(nextCharIndex(text, 1)).toEqual(3);
    expect(nextCharIndex(text, 3)).toEqual(4);
  });

  test('should move over a character and its combining marks as a whole', () => {
    const text = 'x❤️y';
    expect(nextCharIndex(text, 0)).toEqual(1);
    expect(nextCharIndex(text, 1)).toEqual(3);
    expect(nextCharIndex(text, 3)).toEqual(4);
  });

  test('should move over a leading combining mark', () => {
    expect(nextCharIndex('́a', 0)).toEqual(1);
  });
});
