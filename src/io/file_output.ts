import { BufferedOutput } from './buffered_output';
import { GeneralError } from '../error_exit_code';
import type { IFileSystem } from '../file_system';

export class FileOutput extends BufferedOutput {
  constructor(
    readonly fileSystem: IFileSystem,
    readonly path: string,
    readonly append: boolean
  ) {
    super();

    // Check that the file can be written to, e.g. parent directory exists, and throw an appropriate
    // error if not.
    const { FS, ERRNO_CODES } = fileSystem;
    const info = FS.analyzePath(path);
    if (info.exists) {
      if (FS.isDir(info.object.mode)) {
        throw new GeneralError(`${path}: Is a directory`);
      }
    } else if (info.error === ERRNO_CODES.ENOTDIR) {
      throw new GeneralError(`${path}: Not a directory`);
    } else if (!info.parentExists) {
      throw new GeneralError(`${path}: No such file or directory`);
    }
  }

  override flush(): void {
    const { FS } = this.fileSystem;
    let content = this.allContent;

    if (this.append) {
      try {
        const prevContent = FS.readFile(this.path, { encoding: 'utf8' });
        content = prevContent + content;
      } catch (e) {
        // If file does not exist, fallback to write (non-append) behaviour.
      }
    }

    FS.writeFile(this.path, content, { mode: 0o664 });
    this.clear();
  }
}
