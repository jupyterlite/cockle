import { RuntimeExports } from './fs';

export interface IFileSystem {
  FS: typeof RuntimeExports.FS;
  PATH: typeof RuntimeExports.PATH;
  ERRNO_CODES: typeof RuntimeExports.ERRNO_CODES;
  PROXYFS: typeof RuntimeExports.PROXYFS;
  mountpoint: string;
}
