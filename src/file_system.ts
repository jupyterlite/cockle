import { GeneralError } from './error_exit_code';

export interface IFileSystem {
  FS: any;
  PATH: any;
  ERRNO_CODES: any;
  PROXYFS: any;
  mountpoint: string;
}

/**
 * Check that a redirect file path can be used before it is used, and throw an appropriate error
 * if not. If create is true the file does not need to exist but its parent directory must, and it
 * must not be a directory.
 */
export function checkFilePath(fileSystem: IFileSystem, path: string, create: boolean): void {
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
