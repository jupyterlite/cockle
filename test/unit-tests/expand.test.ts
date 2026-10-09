import {
  expandHeredoc,
  expandString,
  expandToken,
  expandTokens,
  splitToken
} from '../../src/expand';
import { tokenize } from '../../src/tokenize';

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
