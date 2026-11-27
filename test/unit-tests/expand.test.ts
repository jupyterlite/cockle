import {
  expandAssignment,
  expandFields,
  expandHeredoc,
  expandPrompt,
  expandString,
  expandToken,
  splitToken,
  splitTokenFields
} from '../../src/expand';
import type { Token } from '../../src/tokenize';
import { tokenize } from '../../src/tokenize';

/**
 * Expand environment variable references in command arguments, returning the field texts.
 */
function expandTokens(tokens: Token[], environment: ReadonlyMap<string, string>): string[] {
  return expandFields(tokens, environment).map(field => field.text);
}

function getEnvironment(): Map<string, string> {
  const environment = new Map<string, string>();
  environment.set('HOME', '/home/cockle');
  environment.set('NAME', 'world');
  environment.set('A', 'x');
  environment.set('B', 'y');
  environment.set('EMPTY', '');
  return environment;
}

describe('expandString', () => {
  const environment = getEnvironment();

  test('should expand $NAME', () => {
    expect(expandString('$HOME', environment)).toEqual('/home/cockle');
  });

  test('should expand ${NAME} including adjacent characters', () => {
    expect(expandString('${NAME}there', environment)).toEqual('worldthere');
    expect(expandString('hello ${NAME}', environment)).toEqual('hello world');
  });

  test('should join multiple references', () => {
    expect(expandString('$HOME/$NAME', environment)).toEqual('/home/cockle/world');
  });

  test('should expand a reference to an unset variable to an empty string', () => {
    expect(expandString('$UNKNOWN', environment)).toEqual('');
  });

  test('should treat a set-but-empty variable the same as an unset one', () => {
    expect(expandString('$EMPTY-x', environment)).toEqual('-x');
  });

  test('should expand $? to the exit code of the previous command', () => {
    const env2 = new Map(environment);
    env2.set('?', '2');
    expect(expandString('$?', env2)).toEqual('2');
    expect(expandString('$?x', env2)).toEqual('2x');
    expect(expandString('${?}', env2)).toEqual('2');
    // Nothing has run yet, and bash reports 0 there.
    expect(expandString('$?', environment)).toEqual('0');
  });

  test('should leave a dollar that starts no reference', () => {
    expect(expandString('$', environment)).toEqual('$');
    expect(expandString('a$', environment)).toEqual('a$');
    expect(expandString('$9', environment)).toEqual('$9');
    expect(expandString('${', environment)).toEqual('${');
  });

  test('should remove a backslash and not expand the following reference', () => {
    // bash: 'X=w; echo \$X' prints '$X'.
    expect(expandString('\\$HOME', environment)).toEqual('$HOME');
    expect(expandString('a\\$HOME', environment)).toEqual('a$HOME');
  });

  test('should remove a backslash before a character that is not special', () => {
    expect(expandString('\\\\', environment)).toEqual('\\');
    expect(expandString('a\\qb', environment)).toEqual('aqb');
  });

  test('should not recursively expand', () => {
    const env2 = new Map(environment);
    env2.set('A', '$B');
    expect(expandString('$A', env2)).toEqual('$B');
  });
});

describe('expandPrompt', () => {
  function prompt(value: string, pwd: string): string {
    const environment = getEnvironment();
    environment.set('PWD', pwd);
    return expandPrompt(value, environment);
  }

  test('should expand \\w to the current directory', () => {
    expect(prompt('\\w$ ', '/drive/dirA')).toEqual('/drive/dirA$ ');
  });

  test('should expand \\W to the last component of the current directory', () => {
    expect(prompt('\\W$ ', '/drive/dirA')).toEqual('dirA$ ');
  });

  test('should replace a leading $HOME with ~', () => {
    expect(prompt('\\w$ ', '/home/cockle')).toEqual('~$ ');
    expect(prompt('\\W$ ', '/home/cockle')).toEqual('~$ ');
    expect(prompt('\\w$ ', '/home/cockle/dirA')).toEqual('~/dirA$ ');
    expect(prompt('\\W$ ', '/home/cockle/dirA')).toEqual('dirA$ ');
    expect(prompt('\\w$ ', '/home/cockle2')).toEqual('/home/cockle2$ ');
  });

  test('should expand the root directory to /', () => {
    expect(prompt('\\w$ ', '/')).toEqual('/$ ');
    expect(prompt('\\W$ ', '/')).toEqual('/$ ');
  });

  test('should not expand an escaped backslash followed by w or W', () => {
    expect(prompt('\\\\w$ ', '/drive')).toEqual('\\w$ ');
    expect(prompt('\\\\W$ ', '/drive')).toEqual('\\W$ ');
  });

  test('should not expand a $ or backslash in the directory name', () => {
    expect(prompt('\\w$ ', '/drive/$NAME')).toEqual('/drive/$NAME$ ');
    expect(prompt('\\W$ ', '/drive/a\\b')).toEqual('a\\b$ ');
  });

  test('should expand environment variable references', () => {
    expect(prompt('$NAME:\\W$ ', '/drive')).toEqual('world:drive$ ');
  });
});

describe('expandHeredoc', () => {
  const environment = getEnvironment();

  test('should preserve backslashes before characters that are not special', () => {
    expect(expandHeredoc('\\q', environment)).toEqual('\\q');
  });

  test('should remove backslashes only before special characters', () => {
    expect(expandHeredoc('\\$HOME \\\\ \\`', environment)).toEqual('$HOME \\ `');
  });
});

describe('expandToken / expandTokens', () => {
  const environment = getEnvironment();

  test('should expand unquoted tokens', () => {
    expect(expandTokens(tokenize('echo $HOME'), environment)).toEqual(['echo', '/home/cockle']);
  });

  test('should expand double-quoted tokens', () => {
    expect(expandTokens(tokenize('echo "$HOME"'), environment)).toEqual(['echo', '/home/cockle']);
  });

  test('should not expand single-quoted tokens', () => {
    expect(expandTokens(tokenize("echo '$HOME'"), environment)).toEqual(['echo', '$HOME']);
  });

  test('should not expand a single-quoted section inside a token', () => {
    expect(expandTokens(tokenize("echo pre'$X'"), environment)).toEqual(['echo', 'pre$X']);
    expect(expandTokens(tokenize("echo 'don'$HOME"), environment)).toEqual([
      'echo',
      'don/home/cockle'
    ]);
  });

  test('should handle a single-quoted section followed by an unquoted reference', () => {
    const env2 = new Map(environment);
    env2.set('Y', 'y');
    expect(expandTokens(tokenize("echo '$X'$Y"), env2)).toEqual(['echo', '$Xy']);
  });

  test('should not expand a name across a quoted-section boundary', () => {
    // Real bash: `X=x; echo $X'a'` prints `xa`, `X=x; echo "$X"a` prints `xa`: the name ends at
    // the boundary, so the lookup is for X and never for 'Xa'.
    const env2 = new Map(environment);
    env2.set('X', 'x');
    expect(expandTokens(tokenize("echo $X'a'"), env2)).toEqual(['echo', 'xa']);
    expect(expandTokens(tokenize('echo "$X"a'), env2)).toEqual(['echo', 'xa']);
  });

  test('should expand the value part of a NAME=value argument', () => {
    expect(expandTokens(tokenize('export A=$HOME'), environment)).toEqual([
      'export',
      'A=/home/cockle'
    ]);
  });

  test('should expand an argument of a wasm command', () => {
    expect(expandTokens(tokenize('env A=$HOME'), environment)).toEqual(['env', 'A=/home/cockle']);
  });

  test('should not change tokens without a dollar', () => {
    expect(expandTokens(tokenize('ls -al file1'), environment)).toEqual(['ls', '-al', 'file1']);
    expect(expandToken(tokenize('echo plain')[1], environment)).toEqual('plain');
  });

  test('should expand a token that the shell itself does not expand', () => {
    // Redirect targets are out of scope for the shell wiring, but the helper works on the token.
    const env2 = new Map(environment);
    env2.set('OUT', 'out.txt');
    const tokens = tokenize('echo hello > $OUT');
    expect(expandToken(tokens[3], env2)).toEqual('out.txt');
  });

  test('should expand the value of a NAME=value token', () => {
    // Both sides of 'NAME=value' are expanded: real bash `A=1 B=$A` sets B to 1, so the shell
    // relies on the value being expanded against the environment it has updated so far.
    const env2 = new Map(environment);
    env2.set('Y', 'z');
    expect(expandToken(tokenize('B=$Y')[0], env2)).toEqual('B=z');
    expect(expandToken(tokenize('B=$A')[0], environment)).toEqual('B=x');
  });
});

describe('splitToken', () => {
  const environment = getEnvironment();
  environment.set('SP', 'a b');
  environment.set('SPACES', '  ');

  const split = (source: string): string[] => splitToken(tokenize(source)[0], environment);

  test('should split an unquoted expansion on whitespace', () => {
    expect(split('$SP')).toEqual(['a', 'b']);
    expect(split('a$SP')).toEqual(['aa', 'b']);
    expect(split('$SP$SP')).toEqual(['a', 'ba', 'b']);
    expect(split('x $SP')).toEqual(['x']);
  });

  test('should not split a quoted or literal space', () => {
    expect(split('"$SP"')).toEqual(['a b']);
    expect(split('pre"$SP"')).toEqual(['prea b']);
    expect(split('"a b"')).toEqual(['a b']);
    expect(split('a b')).toEqual(['a']);
  });

  test('should not split when the whitespace run includes a literal character', () => {
    // bash: 'A=" "; set -- x$A" "y' gives the two fields 'x' and ' y'.
    const env2 = new Map(environment);
    env2.set('A', ' ');
    const tokens = tokenize('x$A" "y');
    expect(splitToken(tokens[0], env2)).toEqual(['x', ' y']);
  });

  test('should discard a field produced only by an expansion', () => {
    const env2 = new Map(environment);
    env2.set('EMPTY', '');
    env2.set('SPACES', '  ');
    expect(splitToken(tokenize('$EMPTY')[0], env2)).toEqual([]);
    expect(splitToken(tokenize('"$EMPTY"')[0], env2)).toEqual(['']);
    expect(splitToken(tokenize('$SPACES')[0], env2)).toEqual([]);
    expect(splitToken(tokenize('x$SPACES')[0], env2)).toEqual(['x']);
  });

  test('should keep a multi-character value in one field', () => {
    expect(split('$HOME')).toEqual(['/home/cockle']);
    expect(split('plain')).toEqual(['plain']);
  });
});

describe('splitTokenFields', () => {
  const environment = getEnvironment();
  environment.set('STAR', '*');

  const fields = (source: string, env: Map<string, string> = environment) =>
    splitTokenFields(tokenize(source)[0], env);

  test('should mark quoted and escaped characters', () => {
    expect(fields("'f*'")).toEqual([{ text: 'f*', quoted: [true, true] }]);
    expect(fields('f\\*')).toEqual([{ text: 'f*', quoted: [false, true] }]);
    expect(fields('plain')).toEqual([
      { text: 'plain', quoted: [false, false, false, false, false] }
    ]);
  });

  test('should mark only the quoted part of a word', () => {
    expect(fields('f"*"x')).toEqual([{ text: 'f*x', quoted: [false, true, false] }]);
  });

  test('should keep an expansion unquoted and a quoted expansion literal', () => {
    expect(fields('$STAR')).toEqual([{ text: '*', quoted: [false] }]);
    expect(fields('"$STAR"')).toEqual([{ text: '*', quoted: [true] }]);
  });

  test('should keep the quoting of each field separate', () => {
    const env = new Map(environment);
    env.set('SP', 'a b');
    expect(fields('x$SP', env)).toEqual([
      { text: 'xa', quoted: [false, false] },
      { text: 'b', quoted: [false] }
    ]);
    expect(fields('x"$SP"', env)).toEqual([{ text: 'xa b', quoted: [false, true, true, true] }]);
  });

  test('should have the same text as splitToken', () => {
    const env = new Map(environment);
    env.set('SP', 'a b');
    for (const source of ['$SP', 'x"$SP"', "'a b'", 'plain', '$EMPTY', 'a\\ b']) {
      expect(splitTokenFields(tokenize(source)[0], env).map(field => field.text)).toEqual(
        splitToken(tokenize(source)[0], env)
      );
    }
  });
});

describe('tilde expansion', () => {
  const environment = getEnvironment();

  const fields = (source: string, env: Map<string, string> = environment) =>
    splitTokenFields(tokenize(source)[0], env);
  const text = (source: string, env: Map<string, string> = environment) =>
    fields(source, env).map(field => field.text);

  test('should expand ~ on its own and before a slash', () => {
    expect(text('~')).toEqual(['/home/cockle']);
    expect(text('~/')).toEqual(['/home/cockle/']);
    expect(text('~/x/y')).toEqual(['/home/cockle/x/y']);
    expect(expandToken(tokenize('~/x')[0], environment)).toEqual('/home/cockle/x');
  });

  test('should not expand a quoted or escaped ~', () => {
    expect(text("'~'")).toEqual(['~']);
    expect(text('"~/x"')).toEqual(['~/x']);
    expect(text('\\~')).toEqual(['~']);
    expect(text('\\~/x')).toEqual(['~/x']);
  });

  test('should not expand ~ followed by a quoted slash', () => {
    expect(text('~"/x"')).toEqual(['~/x']);
  });

  test('should not expand ~ that is not at the start of the word', () => {
    expect(text('a~')).toEqual(['a~']);
    expect(text('a/~')).toEqual(['a/~']);
    expect(text('a/~/b')).toEqual(['a/~/b']);
  });

  test('should not expand ~ followed by other characters', () => {
    expect(text('~name')).toEqual(['~name']);
    expect(text('~name/x')).toEqual(['~name/x']);
    expect(text('~+')).toEqual(['~+']);
    expect(text('~-')).toEqual(['~-']);
    expect(text('~:x')).toEqual(['~:x']);
  });

  test('should mark the expanded text as quoted so that it is not a wildcard', () => {
    const env = new Map(environment);
    env.set('HOME', '/h*');
    expect(fields('~/*', env)).toEqual([
      { text: '/h*/*', quoted: [true, true, true, false, false] }
    ]);
  });

  test('should not split the expanded text into fields', () => {
    const env = new Map(environment);
    env.set('HOME', '/my home');
    expect(text('~/x', env)).toEqual(['/my home/x']);
  });

  test('should expand references after the ~', () => {
    expect(text('~/$NAME')).toEqual(['/home/cockle/world']);
  });

  test('should leave ~ if HOME is not set', () => {
    const env = new Map(environment);
    env.delete('HOME');
    expect(text('~', env)).toEqual(['~']);
    expect(text('~/x', env)).toEqual(['~/x']);
  });

  test('should not expand ~ in a string, prompt or here document', () => {
    expect(expandString('~/x', environment)).toEqual('~/x');
    expect(expandPrompt('~/x', environment)).toEqual('~/x');
    expect(expandHeredoc('~/x', environment)).toEqual('~/x');
  });

  test('should not expand ~ in the value of a NAME=value argument', () => {
    expect(text('A=~/x')).toEqual(['A=~/x']);
  });

  test('should expand ~ at the start of an assignment value and after each colon', () => {
    const assign = (source: string) => expandAssignment(tokenize(source)[0], environment);
    expect(assign('A=~')).toEqual('A=/home/cockle');
    expect(assign('A=~/x')).toEqual('A=/home/cockle/x');
    expect(assign('A=~/x:~/y')).toEqual('A=/home/cockle/x:/home/cockle/y');
    expect(assign('A=~:~')).toEqual('A=/home/cockle:/home/cockle');
    expect(assign('A=$B:~/y')).toEqual('A=y:/home/cockle/y');
  });

  test('should not expand other ~ in an assignment value', () => {
    const assign = (source: string) => expandAssignment(tokenize(source)[0], environment);
    expect(assign('A=x~')).toEqual('A=x~');
    expect(assign('A=x/~')).toEqual('A=x/~');
    expect(assign('A="~"')).toEqual('A=~');
    expect(assign("A='~/x'")).toEqual('A=~/x');
    expect(assign('A=~name')).toEqual('A=~name');
  });
});
