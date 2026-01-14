import { Aliases } from '../../src/aliases';
import { CommandNode, parse, PipeNode, RedirectNode } from '../../src/parse';

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

  test('should raise on redirect of stdout without target file', () => {
    expect(() => parse('ls >')).toThrow();
    expect(() => parse('ls >>')).toThrow();
  });

  test('should raise on redirect of stderr without target file', () => {
    expect(() => parse('ls 2>')).toThrow();
    expect(() => parse('ls 2>>')).toThrow();
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
});
