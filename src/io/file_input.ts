import { InputAll } from './input_all';
import type { IFileSystem } from '../file_system';

export class FileInput extends InputAll {
  constructor(
    readonly fileSystem: IFileSystem,
    readonly path: string,
    readonly create = false
  ) {
    super();
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
