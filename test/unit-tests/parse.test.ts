import { Aliases } from '../../src/aliases';
import { CommandNode, isCommandComplete, parse, PipeNode, RedirectNode } from '../../src/parse';

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

describe('parse', () => {
  test('should support no commands', () => {
    expect(parse('')).toEqual([]);
    expect(parse(' ')).toEqual([]);
    expect(parse('  ')).toEqual([]);
  });

  test('should support single command', () => {
    expect(parse('ls')).toEqual([new CommandNode({ offset: 0, value: 'ls' }, [])]);
    expect(parse('ls -al')).toEqual([
      new CommandNode({ offset: 0, value: 'ls' }, [{ offset: 3, value: '-al' }])
    ]);
    expect(parse('ls -al;')).toEqual([
      new CommandNode({ offset: 0, value: 'ls' }, [{ offset: 3, value: '-al' }])
    ]);
  });

  test('should support multiple commands', () => {
    expect(parse('ls -al;pwd')).toEqual([
      new CommandNode({ offset: 0, value: 'ls' }, [{ offset: 3, value: '-al' }]),
      new CommandNode({ offset: 7, value: 'pwd' }, [])
    ]);
    expect(parse('echo abc;pwd;ls -al')).toEqual([
      new CommandNode({ offset: 0, value: 'echo' }, [{ offset: 5, value: 'abc' }]),
      new CommandNode({ offset: 9, value: 'pwd' }, []),
      new CommandNode({ offset: 13, value: 'ls' }, [{ offset: 16, value: '-al' }])
    ]);
  });

  test('should support pipe', () => {
    expect(parse('ls | sort')).toEqual([
      new PipeNode([
        new CommandNode({ offset: 0, value: 'ls' }, []),
        new CommandNode({ offset: 5, value: 'sort' }, [])
      ])
    ]);
    expect(parse('ls | sort|uniq')).toEqual([
      new PipeNode([
        new CommandNode({ offset: 0, value: 'ls' }, []),
        new CommandNode({ offset: 5, value: 'sort' }, []),
        new CommandNode({ offset: 10, value: 'uniq' }, [])
      ])
    ]);

    expect(parse('ls | sort; cat')).toEqual([
      new PipeNode([
        new CommandNode({ offset: 0, value: 'ls' }, []),
        new CommandNode({ offset: 5, value: 'sort' }, [])
      ]),
      new CommandNode({ offset: 11, value: 'cat' }, [])
    ]);
  });

  test('should support redirect of stdout', () => {
    expect(parse('ls -l > file')).toEqual([
      new CommandNode(
        { offset: 0, value: 'ls' },
        [{ offset: 3, value: '-l' }],
        [new RedirectNode({ offset: 6, value: '>' }, { offset: 8, value: 'file' })]
      )
    ]);
    expect(parse('ls -l >> file')).toEqual([
      new CommandNode(
        { offset: 0, value: 'ls' },
        [{ offset: 3, value: '-l' }],
        [new RedirectNode({ offset: 6, value: '>>' }, { offset: 9, value: 'file' })]
      )
    ]);
    expect(parse('ls -l>file')).toEqual([
      new CommandNode(
        { offset: 0, value: 'ls' },
        [{ offset: 3, value: '-l' }],
        [new RedirectNode({ offset: 5, value: '>' }, { offset: 6, value: 'file' })]
      )
    ]);
    expect(parse('ls -l>>file')).toEqual([
      new CommandNode(
        { offset: 0, value: 'ls' },
        [{ offset: 3, value: '-l' }],
        [new RedirectNode({ offset: 5, value: '>>' }, { offset: 7, value: 'file' })]
      )
    ]);
  });

  test('should support redirect of stderr', () => {
    expect(parse('pwd 2> file')).toEqual([
      new CommandNode(
        { offset: 0, value: 'pwd' },
        [],
        [new RedirectNode({ offset: 4, value: '2>' }, { offset: 7, value: 'file' })]
      )
    ]);
    expect(parse('pwd 2>> file')).toEqual([
      new CommandNode(
        { offset: 0, value: 'pwd' },
        [],
        [new RedirectNode({ offset: 4, value: '2>>' }, { offset: 8, value: 'file' })]
      )
    ]);
    expect(parse('pwd 2>file')).toEqual([
      new CommandNode(
        { offset: 0, value: 'pwd' },
        [],
        [new RedirectNode({ offset: 4, value: '2>' }, { offset: 6, value: 'file' })]
      )
    ]);
    expect(parse('pwd 2>>file')).toEqual([
      new CommandNode(
        { offset: 0, value: 'pwd' },
        [],
        [new RedirectNode({ offset: 4, value: '2>>' }, { offset: 7, value: 'file' })]
      )
    ]);
  });

  test('should support redirect of both stdout and stderr', () => {
    expect(parse('pwd > out 2> err')).toEqual([
      new CommandNode(
        { offset: 0, value: 'pwd' },
        [],
        [
          new RedirectNode({ offset: 4, value: '>' }, { offset: 6, value: 'out' }),
          new RedirectNode({ offset: 10, value: '2>' }, { offset: 13, value: 'err' })
        ]
      )
    ]);
  });

  test('should support redirect to a file descriptor', () => {
    expect(parse('pwd 2>&1')).toEqual([
      new CommandNode(
        { offset: 0, value: 'pwd' },
        [],
        [new RedirectNode({ offset: 4, value: '2>&' }, { offset: 7, value: '1' })]
      )
    ]);
    expect(parse('pwd 1>&2')).toEqual([
      new CommandNode(
        { offset: 0, value: 'pwd' },
        [],
        [new RedirectNode({ offset: 4, value: '1>&' }, { offset: 7, value: '2' })]
      )
    ]);
    expect(parse('ls unknown > out 2>&1')).toEqual([
      new CommandNode(
        { offset: 0, value: 'ls' },
        [{ offset: 3, value: 'unknown' }],
        [
          new RedirectNode({ offset: 11, value: '>' }, { offset: 13, value: 'out' }),
          new RedirectNode({ offset: 17, value: '2>&' }, { offset: 20, value: '1' })
        ]
      )
    ]);
  });

  test('should support redirects anywhere in a command', () => {
    expect(parse('echo a > f b')).toEqual([
      new CommandNode(
        { offset: 0, value: 'echo' },
        [
          { offset: 5, value: 'a' },
          { offset: 11, value: 'b' }
        ],
        [new RedirectNode({ offset: 7, value: '>' }, { offset: 9, value: 'f' })]
      )
    ]);
    expect(parse('> f echo hi')).toEqual([
      new CommandNode(
        { offset: 4, value: 'echo' },
        [{ offset: 9, value: 'hi' }],
        [new RedirectNode({ offset: 0, value: '>' }, { offset: 2, value: 'f' })]
      )
    ]);
    expect(parse('cat <<< word')).toEqual([
      new CommandNode(
        { offset: 0, value: 'cat' },
        [],
        [new RedirectNode({ offset: 4, value: '<<<' }, { offset: 8, value: 'word' })]
      )
    ]);
    expect(parse('cat <> f')).toEqual([
      new CommandNode(
        { offset: 0, value: 'cat' },
        [],
        [new RedirectNode({ offset: 4, value: '<>' }, { offset: 7, value: 'f' })]
      )
    ]);
  });

  test('should support a command of redirections alone', () => {
    expect(parse('> f')).toEqual([
      new CommandNode(
        undefined,
        [],
        [new RedirectNode({ offset: 0, value: '>' }, { offset: 2, value: 'f' })]
      )
    ]);
    expect(parse('2> f')).toEqual([
      new CommandNode(
        undefined,
        [],
        [new RedirectNode({ offset: 0, value: '2>' }, { offset: 3, value: 'f' })]
      )
    ]);
  });

  test('should raise on redirect of stdout without target file', () => {
    expect(() => parse('ls >')).toThrow();
    expect(() => parse('ls >>')).toThrow();
  });

  test('should raise on redirect of stderr without target file', () => {
    expect(() => parse('ls 2>')).toThrow();
    expect(() => parse('ls 2>>')).toThrow();
    expect(() => parse('ls 2>&')).toThrow();
  });

  test('should support redirect of input', () => {
    expect(parse('wc -l < file')).toEqual([
      new CommandNode(
        { offset: 0, value: 'wc' },
        [{ offset: 3, value: '-l' }],
        [new RedirectNode({ offset: 6, value: '<' }, { offset: 8, value: 'file' })]
      )
    ]);
  });

  test('should use aliases', () => {
    const aliases = getAliases();

    expect(parse('ll', true, aliases)).toEqual([
      new CommandNode({ offset: 0, value: 'ls' }, [
        { offset: 3, value: '--color=auto' },
        { offset: 16, value: '-lF' }
      ])
    ]);
    expect(parse(' ll;', true, aliases)).toEqual([
      new CommandNode({ offset: 1, value: 'ls' }, [
        { offset: 4, value: '--color=auto' },
        { offset: 17, value: '-lF' }
      ])
    ]);
  });

  test('should support quotes', () => {
    expect(parse('alias ll="ls -lF"')).toEqual([
      new CommandNode({ offset: 0, value: 'alias' }, [{ offset: 6, value: 'll=ls -lF' }])
    ]);
    expect(parse('alias ll="ls ""-lF"')).toEqual([
      new CommandNode({ offset: 0, value: 'alias' }, [{ offset: 6, value: 'll=ls -lF' }])
    ]);
    expect(parse('lua -e "A=3;B=9"')).toEqual([
      new CommandNode({ offset: 0, value: 'lua' }, [
        { offset: 4, value: '-e' },
        { offset: 7, value: 'A=3;B=9' }
      ])
    ]);
  });

  test('should detect complete commands', () => {
    expect(isCommandComplete('ls')).toBe(true);
    expect(isCommandComplete('ls -l | wc')).toBe(true);
    expect(isCommandComplete('cat <<EOF\nhello\nEOF')).toBe(true);
    expect(isCommandComplete('echo "hello\nworld"')).toBe(true);
    expect(isCommandComplete('echo hello \\\nworld')).toBe(true);

    expect(isCommandComplete('echo "hello')).toBe(false);
    expect(isCommandComplete('echo hello \\')).toBe(false);
    expect(isCommandComplete('ls |')).toBe(false);
    expect(isCommandComplete('cat <<EOF')).toBe(false);
    expect(isCommandComplete('cat <<EOF\nhello')).toBe(false);
  });

  test('should treat invalid commands as complete', () => {
    expect(isCommandComplete('ls > >')).toBe(true);
  });
});
