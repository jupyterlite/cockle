import { expose } from 'comlink';

import { BaseShellWorker } from './base_shell_worker';
import { IFileSystem } from './file_system';

/**
 * Default shell worker that does not use a DriveFS.
 * Note that this is not exported as it is accessed from Shell via the filename.
 */
class ShellWorker extends BaseShellWorker {
  /**
   * Initialize the DriveFS to mount an external file system.
   * Default implementation does nothing.
   */
  protected initDriveFS(
    driveFsBaseUrl: string,
    mountpoint: string,
    fileSystem: IFileSystem
  ): void {}
}

const worker = new ShellWorker();
expose(worker);
