import { Aliases } from '../../src/aliases';
import { tokenize } from '../../src/tokenize';

function getAliases(): Aliases {
  const aliases = new Aliases();
  // Set standard aliases that are normally set in ShellImpl from cockle-config.json
  aliases.set('dir', 'dir --color=auto');
  aliases.set('grep', 'grep --color=auto');
  aliases.set('ls', 'ls --color=auto');
  aliases.set('ll', 'ls -lF');
  aliases.set('vdir', 'vdir --color=auto');
  aliases.set('vi', 'vim');
  return aliases;
}

describe('tokenize', () => {
  test('should support no tokens', () => {
    expect(tokenize('')).toEqual([]);
    expect(tokenize(' ')).toEqual([]);
    expect(tokenize('  ')).toEqual([]);
  });

  test('should support single token', () => {
    expect(tokenize('pwd')).toEqual([{ offset: 0, value: 'pwd' }]);
    expect(tokenize('grep')).toEqual([{ offset: 0, value: 'grep' }]);
  });

  test('should support single token ignoring whitespace', () => {
    expect(tokenize('ls  ')).toEqual([{ offset: 0, value: 'ls' }]);
    expect(tokenize('  ls')).toEqual([{ offset: 2, value: 'ls' }]);
    expect(tokenize(' ls   ')).toEqual([{ offset: 1, value: 'ls' }]);
  });

  test('should support multiple tokens', () => {
    expect(tokenize('ls -al; pwd')).toEqual([
      { offset: 0, value: 'ls' },
      { offset: 3, value: '-al' },
      { offset: 6, value: ';' },
      { offset: 8, value: 'pwd' }
    ]);
  });

  test('should support delimiters with and without whitespace', () => {
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

  test('should support pipe', () => {
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

  test('should support redirection of stdout', () => {
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

  test('should support redirection of stdin', () => {
    expect(tokenize('wc -l < somefile')).toEqual([
      { offset: 0, value: 'wc' },
      { offset: 3, value: '-l' },
      { offset: 6, value: '<' },
      { offset: 8, value: 'somefile' }
    ]);
  });

  test('should use aliases', () => {
    const aliases = getAliases();

    expect(tokenize('ll', true, aliases)).toEqual([
      { offset: 0, value: 'ls' },
      { offset: 3, value: '--color=auto' },
      { offset: 16, value: '-lF' }
    ]);
    expect(tokenize('ll;', true, aliases)).toEqual([
      { offset: 0, value: 'ls' },
      { offset: 3, value: '--color=auto' },
      { offset: 16, value: '-lF' },
      { offset: 19, value: ';' }
    ]);
    expect(tokenize(' ll ', true, aliases)).toEqual([
      { offset: 1, value: 'ls' },
      { offset: 4, value: '--color=auto' },
      { offset: 17, value: '-lF' }
    ]);
    expect(tokenize('cat; ll', true, aliases)).toEqual([
      { offset: 0, value: 'cat' },
      { offset: 3, value: ';' },
      { offset: 5, value: 'ls' },
      { offset: 8, value: '--color=auto' },
      { offset: 21, value: '-lF' }
    ]);
    expect(tokenize('ll; cat', true, aliases)).toEqual([
      { offset: 0, value: 'ls' },
      { offset: 3, value: '--color=auto' },
      { offset: 16, value: '-lF' },
      { offset: 19, value: ';' },
      { offset: 21, value: 'cat' }
    ]);
    expect(tokenize('vi', true, aliases)).toEqual([{ offset: 0, value: 'vim' }]);
  });

  describe('quote handling', () => {
    test('should support matching single and double quotes', () => {
      expect(tokenize("'ls -l'")).toEqual([{ offset: 0, value: 'ls -l' }]);
      expect(tokenize('"ls -l"')).toEqual([{ offset: 0, value: 'ls -l' }]);
    });

    test('should throw if end quotes missing', () => {
      expect(async () => await tokenize('"ls')).rejects.toThrow();
      expect(async () => await tokenize("'ls")).rejects.toThrow();
    });

    test('should work next to whitespace', () => {
      expect(tokenize('ls "a b"')).toEqual([
        { offset: 0, value: 'ls' },
        { offset: 3, value: 'a b' }
      ]);
      expect(tokenize('"a b" ls')).toEqual([
        { offset: 0, value: 'a b' },
        { offset: 6, value: 'ls' }
      ]);
    });

    test('should support containing the other quote type', () => {
      expect(tokenize('"xy\'s"')).toEqual([{ offset: 0, value: "xy's" }]);
      expect(tokenize("'xy\"s'")).toEqual([{ offset: 0, value: 'xy"s' }]);
    });

    test('should join adjacent quoted sections', () => {
      expect(tokenize('"ls -l""h"')).toEqual([{ offset: 0, value: 'ls -lh' }]);
    });

    test('should join a preceding non-quoted section', () => {
      expect(tokenize('ABC="ab c"')).toEqual([{ offset: 0, value: 'ABC=ab c' }]);
    });

    test('should join a following non-quoted section', () => {
      expect(tokenize('"ab c"d')).toEqual([{ offset: 0, value: 'ab cd' }]);
    });

    test('should support a complicated example', () => {
      expect(tokenize('lua -e "A=3; B=7" -v')).toEqual([
        { offset: 0, value: 'lua' },
        { offset: 4, value: '-e' },
        { offset: 7, value: 'A=3; B=7' },
        { offset: 18, value: '-v' }
      ]);
    });
  });
});
