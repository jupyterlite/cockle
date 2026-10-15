import type { IFileSystem } from '../file_system';

export function expandFilenames(args: string[], fileSystem: IFileSystem): string[] {
  const { PATH } = fileSystem;
  const ret: string[] = [];

  // ToDo:
  // - Handling of absolute paths
  // - Handling of . and .. and hidden files
  // - Wildcards in quoted strings should be ignored
  // - [ab] syntax
  // - Multiple wildcards in different directory levels in the same arg
  for (const arg of args) {
    // May not always be appropriate to do filename wildcard expansion, it depends if we have
    // information the possible command arguments.
    if (arg.startsWith('-')) {
      ret.push(arg);
      continue;
    } else if (!(arg.includes('*') || arg.includes('?'))) {
      ret.push(arg);
      continue;
    }

    const { FS } = fileSystem;
    const analyze = FS.analyzePath(arg, false);
    if (!analyze.parentExists) {
      ret.push(arg);
      continue;
    }
    const parentPath = analyze.parentPath;

    // Assume relative path.
    let relativePath = parentPath;
    const pwd = FS.cwd();
    if (relativePath.startsWith(pwd)) {
      relativePath = relativePath.slice(pwd.length);
      if (relativePath.startsWith('/')) {
        relativePath = relativePath.slice(1);
      }
    }

    let possibles = FS.readdir(parentPath);

    // Transform match string to a regex.
    // Escape special characters, * and ? dealt with separately.
    let match = analyze.name.replace(/[.+^${}()|[\]\\]/g, '\\$&');
    match = match.replaceAll('*', '.*');
    match = match.replaceAll('?', '.');
    const regex = new RegExp(`^${match}$`);
    possibles = possibles.filter((path: string) => path.match(regex));

    // Remove all . files/directories; need to fix this.
    possibles = possibles.filter((path: string) => !path.startsWith('.'));

    if (relativePath.length > 0) {
      possibles = possibles.map((path: string) => PATH.join(relativePath, path));
    }

    if (possibles.length > 0) {
      ret.push(...possibles);
    } else {
      ret.push(arg);
    }
  }

  return ret;
}
