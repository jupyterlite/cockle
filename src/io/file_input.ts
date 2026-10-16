import { InputAll } from './input_all';
import { GeneralError } from '../error_exit_code';
import type { IFileSystem } from '../file_system';

export class FileInput extends InputAll {
  constructor(
    readonly fileSystem: IFileSystem,
    readonly path: string,
    readonly create = false
  ) {
    super();

    // Check that the file exists before it is used, and throw an appropriate error if not.
    const { FS, ERRNO_CODES } = fileSystem;
    const info = FS.analyzePath(path);
    if (info.exists) {
      if (create && FS.isDir(info.object.mode)) {
        throw new GeneralError(`${path}: Is a directory`);
      }
    } else if (info.error === ERRNO_CODES.ENOTDIR) {
      throw new GeneralError(`${path}: Not a directory`);
    } else if (!create || !info.parentExists) {
      throw new GeneralError(`${path}: No such file or directory`);
    }
  }

  readAll(): string {
    const { FS } = this.fileSystem;
    if (this.create && !FS.analyzePath(this.path).exists) {
      // '<> file' creates the file if it does not already exist.
      FS.writeFile(this.path, '', { mode: 0o664 });
    }
    return FS.readFile(this.path, { encoding: 'utf8' });
  }
}
