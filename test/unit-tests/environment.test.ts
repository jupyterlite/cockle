import { ansi } from '../../src/ansi';
import { Environment } from '../../src/environment';

describe('Environment.createDefault', () => {
  [false, true].forEach(color => {
    test(`should set terminal env vars for color ${color}`, () => {
      const env = Environment.createDefault(color, 'shellId', undefined);
      expect(env.get('PS1')).toEqual('\\w$ ');
      if (color) {
        expect(env.get('TERM')).toEqual('xterm-256color');
        expect(env.get('TERMINFO')).toEqual('/usr/local/share/terminfo');
      } else {
        expect(env.has('TERM')).toBe(false);
        expect(env.has('TERMINFO')).toBe(false);
      }
    });
  });

  ['', 'abc'].forEach(shellId => {
    test(`should set shell ID env var for shellId '${shellId}'`, () => {
      const env = Environment.createDefault(false, shellId, undefined);
      if (shellId) {
        expect(env.get('COCKLE_SHELL_ID')).toEqual(shellId);
      } else {
        expect(env.has('COCKLE_SHELL_ID')).toBe(false);
      }
    });
  });

  [undefined, '', 'def'].forEach(browsingContextId => {
    test(`should set browsing context ID env var for browsingContextId '${browsingContextId}'`, () => {
      const env = Environment.createDefault(false, 'shellId', browsingContextId);
      if (browsingContextId) {
        expect(env.get('COCKLE_BROWSING_CONTEXT_ID')).toEqual(browsingContextId);
      } else {
        expect(env.has('COCKLE_BROWSING_CONTEXT_ID')).toBe(false);
      }
    });
  });

  [undefined, 'web_user', 'someone'].forEach(user => {
    test(`should set user env vars for user ${user}`, () => {
      const env = Environment.createDefault(false, 'shellId', undefined, user);
      const expected = user ?? 'web_user';
      expect(env.get('HOME')).toEqual(`/home/${expected}`);
      expect(env.get('LOGNAME')).toEqual(expected);
      expect(env.get('USER')).toEqual(expected);
    });
  });
});

describe('Environment.getPrompt', () => {
  function getEnvironment(color: boolean): Environment {
    const env = Environment.createDefault(color, 'shellId', undefined);
    env.set('PWD', '/drive');
    return env;
  }

  test('should not color PS1 if color is false', () => {
    const env = getEnvironment(false);
    expect(env.getPrompt(1)).toEqual('/drive$ ');
  });

  [undefined, '0'].forEach(darkMode => {
    test(`should color PS1 green up to the $ for COCKLE_DARK_MODE ${darkMode}`, () => {
      const env = getEnvironment(true);
      if (darkMode !== undefined) {
        env.set('COCKLE_DARK_MODE', darkMode);
      }
      expect(env.getPrompt(1)).toEqual(ansi.styleGreen + '/drive' + ansi.styleReset + '$ ');
    });
  });

  test('should color PS1 bold green up to the $ for COCKLE_DARK_MODE 1', () => {
    const env = getEnvironment(true);
    env.set('COCKLE_DARK_MODE', '1');
    expect(env.getPrompt(1)).toEqual(ansi.styleBoldGreen + '/drive' + ansi.styleReset + '$ ');
  });

  test('should color PS1 up to the last $', () => {
    const env = getEnvironment(true);
    env.set('PWD', '/drive/a$b');
    expect(env.getPrompt(1)).toEqual(ansi.styleGreen + '/drive/a$b' + ansi.styleReset + '$ ');
  });

  test('should color all of PS1 if it does not contain a $', () => {
    const env = getEnvironment(true);
    env.set('PS1', '\\w> ');
    expect(env.getPrompt(1)).toEqual(ansi.styleGreen + '/drive> ' + ansi.styleReset);
  });

  test('should use a default PS1 if it is not set', () => {
    const env = getEnvironment(false);
    env.delete('PS1');
    expect(env.getPrompt(1)).toEqual('$ ');
  });

  [false, true].forEach(color => {
    test(`should not color PS2 for color ${color}`, () => {
      const env = getEnvironment(color);
      expect(env.getPrompt(2)).toEqual('> ');
      env.set('PS2', '\\W> ');
      expect(env.getPrompt(2)).toEqual('drive> ');
    });
  });
});
