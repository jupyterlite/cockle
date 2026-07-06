import type { Remote } from 'comlink';
import { expose } from 'comlink';
import { BaseShellWorker } from './base_shell_worker';
import type { IShellWorker } from './defs_internal';
import type { IDriveFSOptions } from './drive_fs';

// Comlink worker as seen from BaseShell in main UI thread.
export interface IComlinkShellWorker extends Remote<IShellWorker> {}

/**
 * Default shell worker that does not use a DriveFS.
 * Note that this is not exported as it is accessed from Shell via the filename.
 */
class ShellWorker extends BaseShellWorker {
  /**
   * Initialize the DriveFS to mount an external file system.
   * Default implementation does nothing.
   */
  protected initDriveFS(options: IDriveFSOptions): void {}
}

const worker = new ShellWorker();
expose(worker);
