import { expandString, expandToken, expandTokens } from '../../src/expand';
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

  test('should leave a dollar that starts no reference', () => {
    expect(expandString('$', environment)).toEqual('$');
    expect(expandString('a$', environment)).toEqual('a$');
    expect(expandString('$9', environment)).toEqual('$9');
    expect(expandString('${', environment)).toEqual('${');
  });

  test('should not expand a reference preceded by a backslash', () => {
    expect(expandString('\\$HOME', environment)).toEqual('\\$HOME');
  });

  test('should not recursively expand', () => {
    const env2 = new Map(environment);
    env2.set('A', '$B');
    expect(expandString('$A', env2)).toEqual('$B');
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
