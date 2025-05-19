import { IFileSystem } from './file_system';

export interface IDriveFSOptions {
  browsingContextId?: string;
  baseUrl: string;
  fileSystem: IFileSystem;
  mountpoint: string;
}
