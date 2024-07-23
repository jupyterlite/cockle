import { Aliases, tokenize } from '../src';

describe('Tokenize', () => {
  it('should support no tokens', () => {
    expect(tokenize('')).toEqual([]);
    expect(tokenize(' ')).toEqual([]);
    expect(tokenize('  ')).toEqual([]);
  });

  it('should support single token', () => {
    expect(tokenize('pwd')).toEqual([{ offset: 0, value: 'pwd' }]);
    expect(tokenize('grep')).toEqual([{ offset: 0, value: 'grep' }]);
  });

  it('should support single token ignoring whitespace', () => {
    expect(tokenize(' ')).toEqual([]);
    expect(tokenize('ls  ')).toEqual([{ offset: 0, value: 'ls' }]);
    expect(tokenize('  ls')).toEqual([{ offset: 2, value: 'ls' }]);
    expect(tokenize(' ls   ')).toEqual([{ offset: 1, value: 'ls' }]);
  });

  it('should support multiple tokens', () => {
    expect(tokenize('ls -al; pwd')).toEqual([
      { offset: 0, value: 'ls' },
      { offset: 3, value: '-al' },
      { offset: 6, value: ';' },
      { offset: 8, value: 'pwd' }
    ]);
  });

  it('should support delimiters with and without whitespace', () => {
    expect(tokenize('ls;')).toEqual([
      { offset: 0, value: 'ls' },
      { offset: 2, value: ';' }
    ]);
    expect(tokenize(';ls')).toEqual([
      { offset: 0, value: ';' },
      { offset: 1, value: 'ls' }
    ]);
    expect(tokenize(';ls;;')).toEqual([
      { offset: 0, value: ';' },
      { offset: 1, value: 'ls' },
      { offset: 3, value: ';;' }
    ]);
    expect(tokenize('ls ; ; pwd')).toEqual([
      { offset: 0, value: 'ls' },
      { offset: 3, value: ';' },
      { offset: 5, value: ';' },
      { offset: 7, value: 'pwd' }
    ]);
    expect(tokenize('ls ;; pwd')).toEqual([
      { offset: 0, value: 'ls' },
      { offset: 3, value: ';;' },
      { offset: 6, value: 'pwd' }
    ]);
    expect(tokenize('ls;pwd')).toEqual([
      { offset: 0, value: 'ls' },
      { offset: 2, value: ';' },
      { offset: 3, value: 'pwd' }
    ]);
    expect(tokenize('ls;;pwd')).toEqual([
      { offset: 0, value: 'ls' },
      { offset: 2, value: ';;' },
      { offset: 4, value: 'pwd' }
    ]);
    expect(tokenize(' ;; ')).toEqual([{ offset: 1, value: ';;' }]);
    expect(tokenize(' ; ; ')).toEqual([
      { offset: 1, value: ';' },
      { offset: 3, value: ';' }
    ]);
  });

  it('should support pipe', () => {
    expect(tokenize('ls -l | sort')).toEqual([
      { offset: 0, value: 'ls' },
      { offset: 3, value: '-l' },
      { offset: 6, value: '|' },
      { offset: 8, value: 'sort' }
    ]);
    expect(tokenize('ls -l|sort')).toEqual([
      { offset: 0, value: 'ls' },
      { offset: 3, value: '-l' },
      { offset: 5, value: '|' },
      { offset: 6, value: 'sort' }
    ]);
  });

  it('should support redirection of stdout', () => {
    expect(tokenize('ls -l > somefile')).toEqual([
      { offset: 0, value: 'ls' },
      { offset: 3, value: '-l' },
      { offset: 6, value: '>' },
      { offset: 8, value: 'somefile' }
    ]);
    expect(tokenize('ls -l>somefile')).toEqual([
      { offset: 0, value: 'ls' },
      { offset: 3, value: '-l' },
      { offset: 5, value: '>' },
      { offset: 6, value: 'somefile' }
    ]);
    expect(tokenize('ls >> somefile')).toEqual([
      { offset: 0, value: 'ls' },
      { offset: 3, value: '>>' },
      { offset: 6, value: 'somefile' }
    ]);
    expect(tokenize('ls>>somefile')).toEqual([
      { offset: 0, value: 'ls' },
      { offset: 2, value: '>>' },
      { offset: 4, value: 'somefile' }
    ]);
    expect(tokenize('ls >>somefile')).toEqual([
      { offset: 0, value: 'ls' },
      { offset: 3, value: '>>' },
      { offset: 5, value: 'somefile' }
    ]);
    expect(tokenize('ls>> somefile')).toEqual([
      { offset: 0, value: 'ls' },
      { offset: 2, value: '>>' },
      { offset: 5, value: 'somefile' }
    ]);
  });

  it('should support redirection of stdin', () => {
    expect(tokenize('wc -l < somefile')).toEqual([
      { offset: 0, value: 'wc' },
      { offset: 3, value: '-l' },
      { offset: 6, value: '<' },
      { offset: 8, value: 'somefile' }
    ]);
  });

  it('should use aliases', () => {
    const aliases = new Aliases();
    expect(tokenize('ll', aliases)).toEqual([
      { offset: 0, value: 'ls' },
      { offset: 3, value: '--color=auto' },
      { offset: 16, value: '-lF' }
    ]);
    expect(tokenize('ll;', aliases)).toEqual([
      { offset: 0, value: 'ls' },
      { offset: 3, value: '--color=auto' },
      { offset: 16, value: '-lF' },
      { offset: 19, value: ';' }
    ]);
    expect(tokenize(' ll ', aliases)).toEqual([
      { offset: 1, value: 'ls' },
      { offset: 4, value: '--color=auto' },
      { offset: 17, value: '-lF' }
    ]);
    expect(tokenize('cat; ll', aliases)).toEqual([
      { offset: 0, value: 'cat' },
      { offset: 3, value: ';' },
      { offset: 5, value: 'ls' },
      { offset: 8, value: '--color=auto' },
      { offset: 21, value: '-lF' }
    ]);
    expect(tokenize('ll; cat', aliases)).toEqual([
      { offset: 0, value: 'ls' },
      { offset: 3, value: '--color=auto' },
      { offset: 16, value: '-lF' },
      { offset: 19, value: ';' },
      { offset: 21, value: 'cat' }
    ]);
  });

  describe('quote handling', () => {
    it('should support matching single and double quotes', () => {
      expect(tokenize("'ls -l'")).toEqual([{ offset: 0, value: 'ls -l' }]);
      expect(tokenize('"ls -l"')).toEqual([{ offset: 0, value: 'ls -l' }]);
    });

    it('should throw if end quotes missing', () => {
      expect(() => tokenize('"ls')).toThrow();
      expect(() => tokenize("'ls")).toThrow();
    });

    it('should work next to whitespace', () => {
      expect(tokenize('ls "a b"')).toEqual([
        { offset: 0, value: 'ls' },
        { offset: 3, value: 'a b' }
      ]);
      expect(tokenize('"a b" ls')).toEqual([
        { offset: 0, value: 'a b' },
        { offset: 6, value: 'ls' }
      ]);
    });

    it('should support containing the other quote type', () => {
      expect(tokenize('"xy\'s"')).toEqual([{ offset: 0, value: "xy's" }]);
      expect(tokenize("'xy\"s'")).toEqual([{ offset: 0, value: 'xy"s' }]);
    });

    it('should join adjacent quoted sections', () => {
      expect(tokenize('"ls -l""h"')).toEqual([{ offset: 0, value: 'ls -lh' }]);
    });

    it('should join a preceding non-quoted section', () => {
      expect(tokenize('ABC="ab c"')).toEqual([{ offset: 0, value: 'ABC=ab c' }]);
    });

    it('should join a following non-quoted section', () => {
      expect(tokenize('"ab c"d')).toEqual([{ offset: 0, value: 'ab cd' }]);
    });

    it('should support a complicated example', () => {
      expect(tokenize('lua -e "A=3; B=7" -v')).toEqual([
        { offset: 0, value: 'lua' },
        { offset: 4, value: '-e' },
        { offset: 7, value: 'A=3; B=7' },
        { offset: 18, value: '-v' }
      ]);
    });
  });
});
