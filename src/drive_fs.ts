import { IFileSystem } from './file_system';

export interface IDriveFSOptions {
  browsingContextId?: string;
  driveFsBaseUrl?: string;
  fileSystem: IFileSystem;
  mountpoint: string;
}
