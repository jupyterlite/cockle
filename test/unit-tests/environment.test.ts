import { Environment } from '../../src/environment';

describe('Environment.createDefault', () => {
  [false, true].forEach(color => {
    test(`should set terminal env vars for color ${color}`, () => {
      const env = Environment.createDefault(color, 'shellId', undefined);
      if (color) {
        expect(env.get('PS1')).toMatch('js-shell:');  // Not checking ansi color sequences.
        expect(env.get('PS1')).not.toEqual('js-shell: ');
        expect(env.get('TERM')).toEqual('xterm-256color');
        expect(env.get('TERMINFO')).toEqual('/usr/local/share/terminfo');
      } else {
        expect(env.get('PS1')).toEqual('js-shell: ');
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
