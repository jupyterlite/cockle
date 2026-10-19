import type { IGlobFileSystem } from '../../src/glob';
import { glob, hasWildcard } from '../../src/glob';

const CWD = '/home/user';

/** Normalize a path as a file system would: make it absolute and resolve '.' and '..'. */
function normalize(path: string): string {
  const parts: string[] = [];
  for (const part of (path.startsWith('/') ? path : `${CWD}/${path}`).split('/')) {
    if (part === '' || part === '.') {
      continue;
    }
    if (part === '..') {
      parts.pop();
    } else {
      parts.push(part);
    }
  }
  return `/${parts.join('/')}`;
}

/**
 * A stub file system built from absolute directory and file paths. readdir includes the '.' and
 * '..' entries because the Emscripten file system used by the shell does.
 */
function fakeFileSystem(dirs: string[], files: string[]): IGlobFileSystem {
  const types = new Map<string, 'dir' | 'file'>();
  for (const dir of dirs) {
    types.set(normalize(dir), 'dir');
  }
  for (const file of files) {
    types.set(normalize(file), 'file');
  }

  return {
    cwd: () => CWD,
    readdir(path: string): string[] {
      const base: string = normalize(path);
      if (types.get(base) !== 'dir') {
        throw new Error(`ENOTDIR: ${path}`);
      }
      const prefix: string = base === '/' ? '/' : `${base}/`;
      const names: string[] = [];
      for (const p of types.keys()) {
        if (p !== base && p.startsWith(prefix) && !p.slice(prefix.length).includes('/')) {
          names.push(p.slice(prefix.length));
        }
      }
      return ['.', '..', ...names];
    },
    stat(path: string): { mode: number } {
      const type: 'dir' | 'file' | undefined = types.get(normalize(path));
      if (type === undefined) {
        throw new Error(`ENOENT: ${path}`);
      }
      return { mode: type === 'dir' ? 1 : 0 };
    },
    isDir(mode: number): boolean {
      return mode === 1;
    }
  };
}

const FS: IGlobFileSystem = fakeFileSystem(
  ['/', '/home', '/home/user', '/home/user/dirA', '/home/user/dirA/sub', '/home/user/dirB'],
  [
    '/home/user/-dashed',
    '/home/user/c',
    '/home/user/d',
    '/home/user/f1',
    '/home/user/f[',
    '/home/user/file1',
    '/home/user/file2',
    '/home/user/q-',
    '/home/user/q?',
    '/home/user/qa',
    '/home/user/qb',
    '/home/user/weird file',
    '/home/user/x]',
    '/home/user/.hidden',
    '/home/user/.otherhidden',
    '/home/user/dirA/f*',
    '/home/user/dirA/x.txt',
    '/home/user/dirA/.dotfile',
    '/home/user/dirA/sub/nested.md',
    '/home/user/dirB/y.txt'
  ]
);

/** One-character file names used to test bracket expressions, in sorted order. */
const BRACKET_FILES: string[] = ['-', '0', 'A', '[', '\\', ']', '^', '_', '`', 'a', 'b', 'c', 'z'];
const BRACKET_FS: IGlobFileSystem = fakeFileSystem(
  ['/', '/home', '/home/user'],
  BRACKET_FILES.map(name => `/home/user/${name}`)
);

/** An all-false quoting mask for a pattern, i.e. one with no quoted or escaped characters. */
function noQuotes(text: string): boolean[] {
  return new Array<boolean>(text.length).fill(false);
}

/** A quoting mask for `text` which marks the characters at the given indexes as quoted. */
function markQuoted(text: string, indexes: number[]): boolean[] {
  const quoted: boolean[] = noQuotes(text);
  for (const index of indexes) {
    quoted[index] = true;
  }
  return quoted;
}

/** Glob a pattern which has no quoted characters. */
function run(pattern: string): string[] {
  return glob(pattern, noQuotes(pattern), FS);
}

describe('hasWildcard', () => {
  test('should detect an unquoted metacharacter', () => {
    expect(hasWildcard('file*', noQuotes('file*'))).toBe(true);
    expect(hasWildcard('file?', noQuotes('file?'))).toBe(true);
    expect(hasWildcard('file[12]', noQuotes('file[12]'))).toBe(true);
    expect(hasWildcard('plain', noQuotes('plain'))).toBe(false);
  });

  test('should ignore a quoted or escaped metacharacter', () => {
    expect(hasWildcard('f*', [false, true])).toBe(false);
    expect(hasWildcard('*f', [true, false])).toBe(false);
    expect(hasWildcard('[a]b', [true, true, true, false])).toBe(false);
    expect(hasWildcard('f*', [false, false])).toBe(true);
  });
});

describe('glob', () => {
  test('should match a wildcard in the last component', () => {
    expect(run('file*')).toEqual(['file1', 'file2']);
    expect(run('file?')).toEqual(['file1', 'file2']);
    expect(run('f*')).toEqual(['f1', 'f[', 'file1', 'file2']);
  });

  test('should match bracket expressions', () => {
    expect(run('file[12]')).toEqual(['file1', 'file2']);
    expect(run('file[!2]')).toEqual(['file1']);
    expect(run('file[^2]')).toEqual(['file1']);
    expect(run('[c-d]')).toEqual(['c', 'd']);
    expect(run('[a-c]*')).toEqual(['c']);
    expect(run('q[a-c]')).toEqual(['qa', 'qb']);
  });

  test('should treat a leading or trailing - in a bracket as a literal', () => {
    expect(run('[-c]*')).toEqual(['-dashed', 'c']);
    expect(run('q[a-]')).toEqual(['q-', 'qa']);
  });

  test('should treat ] as a literal when it is first in a bracket', () => {
    expect(run('x[]]')).toEqual(['x]']);
  });

  test('should follow bash for ranges with special characters', () => {
    // An escaped ']' can end a range.
    expect(glob('[0-]]', markQuoted('[0-]]', [3]), BRACKET_FS)).toEqual(['0', 'A', '[', '\\', ']']);
    // A leading ']' or '-' can start a range.
    expect(glob('[]-a]', noQuotes('[]-a]'), BRACKET_FS)).toEqual([']', '^', '_', '`', 'a']);
    expect(glob('[--0]', noQuotes('[--0]'), BRACKET_FS)).toEqual(['-', '0']);
    // A '-' after a range or as a trailing member is literal.
    expect(glob('[a-b-c]', noQuotes('[a-b-c]'), BRACKET_FS)).toEqual(['-', 'a', 'b', 'c']);
  });

  test('should treat a descending range as matching nothing', () => {
    expect(glob('[c-a]', noQuotes('[c-a]'), BRACKET_FS)).toEqual([]);
    expect(glob('[!c-a]', noQuotes('[!c-a]'), BRACKET_FS)).toEqual(BRACKET_FILES);
  });

  test('should drop an invalid range but keep other members', () => {
    expect(glob('[a--c]', noQuotes('[a--c]'), BRACKET_FS)).toEqual(['c']);
    expect(glob('[!a--c]', noQuotes('[!a--c]'), BRACKET_FS)).toEqual(
      BRACKET_FILES.filter(name => name !== 'c')
    );
  });

  test('should treat an unterminated bracket as a literal [', () => {
    expect(run('f[')).toEqual(['f[']);
    expect(run('f[!')).toEqual([]);
  });

  test('should escape special characters in the pattern', () => {
    expect(run('weird file')).toEqual(['weird file']);
    expect(run('weird?file')).toEqual(['weird file']);
    expect(run('weird*')).toEqual(['weird file']);
  });

  test('should treat a quoted or escaped metacharacter as literal', () => {
    expect(glob('dirA/*', markQuoted('dirA/*', [5]), FS)).toEqual([]);
    expect(glob('dirA/f*', markQuoted('dirA/f*', [6]), FS)).toEqual(['dirA/f*']);
    expect(glob('weird?file', markQuoted('weird?file', [5]), FS)).toEqual([]);
    expect(glob('q?', markQuoted('q?', [1]), FS)).toEqual(['q?']);
  });

  test('should treat a quoted character in a bracket as a literal member', () => {
    // The quoted '-' is a member of the class but does not form a range.
    expect(glob('q[a-c]', markQuoted('q[a-c]', [2, 3, 4]), FS)).toEqual(['q-', 'qa']);
  });

  test('should not match hidden files unless the pattern starts with a dot', () => {
    expect(run('*hidden*')).toEqual([]);
    expect(run('.*')).toEqual(['.hidden', '.otherhidden']);
    expect(run('.?*')).toEqual(['.hidden', '.otherhidden']);
    expect(run('[.]*')).toEqual([]);
    expect(run('dirA/.*')).toEqual(['dirA/.dotfile']);
  });

  test('should never match the names . and ..', () => {
    expect(run('.*')).not.toContain('.');
    expect(run('.*')).not.toContain('..');
    expect(run('..*')).toEqual([]);
  });

  test('should match wildcards at several directory levels', () => {
    expect(run('dir*')).toEqual(['dirA', 'dirB']);
    expect(run('dir*/*.txt')).toEqual(['dirA/x.txt', 'dirB/y.txt']);
    expect(run('dir*/*/*.md')).toEqual(['dirA/sub/nested.md']);
    expect(run('dir*/sub')).toEqual(['dirA/sub']);
    expect(run('file1/*')).toEqual([]);
  });

  test('should match an absolute pattern as an absolute path', () => {
    expect(run('/home/user/file?')).toEqual(['/home/user/file1', '/home/user/file2']);
    expect(run('/home/*/f1')).toEqual(['/home/user/f1']);
    expect(run('/home/user/dirA/../dir*')).toEqual([
      '/home/user/dirA/../dirA',
      '/home/user/dirA/../dirB'
    ]);
  });

  test('should preserve the form of a relative pattern', () => {
    expect(run('./file?')).toEqual(['./file1', './file2']);
    expect(run('../user/file?')).toEqual(['../user/file1', '../user/file2']);
    expect(run('dirA/../dir*')).toEqual(['dirA/../dirA', 'dirA/../dirB']);
    expect(run('dirA//x*')).toEqual(['dirA//x.txt']);
    expect(run('dirA//*')).toEqual(['dirA//f*', 'dirA//sub', 'dirA//x.txt']);
    // The star is quoted, so there is no wildcard component and the repeated '/' stays.
    expect(glob('dirA//f*', markQuoted('dirA//f*', [7]), FS)).toEqual(['dirA//f*']);
  });

  test('should collapse repeated slashes after the first wildcard component', () => {
    expect(run('dir*//sub')).toEqual(['dirA/sub']);
    expect(run('dir*///sub/nest*')).toEqual(['dirA/sub/nested.md']);
    expect(run('dir*//*/')).toEqual(['dirA/sub/']);
    expect(run('/home/*//dir*')).toEqual(['/home/user/dirA', '/home/user/dirB']);
    expect(run('//home/*/dir*')).toEqual(['//home/user/dirA', '//home/user/dirB']);
    // The empty component collapses because the first component has an active wildcard, even
    // though the quoted star of the last component is literal.
    expect(glob('dir*//f*', markQuoted('dir*//f*', [7]), FS)).toEqual(['dirA/f*']);
  });

  test('should match only directories for a trailing slash', () => {
    expect(run('dir*/')).toEqual(['dirA/', 'dirB/']);
    expect(run('dir*///')).toEqual(['dirA/', 'dirB/']);
    expect(run('dirA/*/')).toEqual(['dirA/sub/']);
    expect(run('*/*/')).toEqual(['dirA/sub/']);
    expect(run('file*/')).toEqual([]);
  });

  test('should return an empty array when there are no matches', () => {
    expect(run('zzz*')).toEqual([]);
    expect(run('dir*/*.none')).toEqual([]);
  });

  test('should sort the matches', () => {
    expect(run('*')).toEqual([
      '-dashed',
      'c',
      'd',
      'dirA',
      'dirB',
      'f1',
      'f[',
      'file1',
      'file2',
      'q-',
      'q?',
      'qa',
      'qb',
      'weird file',
      'x]'
    ]);
  });
});
