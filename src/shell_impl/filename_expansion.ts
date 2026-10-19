import type { Field } from '../expand';
import type { IFileSystem } from '../file_system';
import { glob, hasWildcard } from '../glob';

/**
 * Expand filename wildcards in command arguments.
 * @param fields The expanded and split fields of the command.
 * @param fileSystem The file system to expand against.
 * @returns The expanded arguments.
 */
export function expandFilenames(fields: Field[], fileSystem: IFileSystem): string[] {
  const { FS } = fileSystem;
  const args: string[] = [];
  for (const field of fields) {
    if (!hasWildcard(field.text, field.quoted)) {
      args.push(field.text);
      continue;
    }
    const matches: string[] = glob(field.text, field.quoted, FS);
    if (matches.length > 0) {
      args.push(...matches);
    } else {
      args.push(field.text);
    }
  }
  return args;
}
