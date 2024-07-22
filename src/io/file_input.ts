import { IFileSystem } from '../file_system';
import { InputAll } from './input_all';

export class FileInput extends InputAll {
  constructor(
    readonly fileSystem: IFileSystem,
    readonly path: string
  ) {
    super();
  }

  readAll(): string {
    const { FS } = this.fileSystem;
    const contents = FS.readFile(this.path, { encoding: 'utf8' });
    return contents;
  }
}
