import { Aliases } from '../../src/aliases';

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

describe('Aliases', () => {
  const aliases = getAliases();

  describe('get', () => {
    test('should return alias string', () => {
      expect(aliases.get('grep')).toEqual('grep --color=auto');
    });

    test('should return undefined for unknown key', () => {
      expect(aliases.get('unknown')).toBeUndefined();
    });
  });

  describe('getRecursive', () => {
    test('should return undefined for unknown key', () => {
      expect(aliases.getRecursive('unknown')).toBeUndefined();
    });

    test('should lookup ls', () => {
      expect(aliases.getRecursive('ls')).toEqual('ls --color=auto');
    });

    test('should lookup ll', () => {
      expect(aliases.getRecursive('ll')).toEqual('ls --color=auto -lF');
    });

    test('should lookup grep', () => {
      expect(aliases.getRecursive('grep')).toEqual('grep --color=auto');
    });
  });

  describe('match', () => {
    test('should match multiple possibilities', () => {
      expect(aliases.match('l')).toEqual(['ls', 'll']);
    });

    test('should match zero possibilities', () => {
      expect(aliases.match('z')).toEqual([]);
    });
  });
});
