import type { Remote } from 'comlink';
import { BaseShellWorker } from './base_shell_worker';
import type { IShellWorker } from './defs_internal';
import type { IDriveFSOptions } from './drive_fs';

// Comlink worker as seen from BaseShell in main UI thread.
export interface IComlinkShellWorker extends Remote<IShellWorker> {}

/**
 * Comlink shell worker that does not use a DriveFS.
 */
export class ComlinkShellWorker extends BaseShellWorker {
  /**
   * Initialize the DriveFS to mount an external file system.
   * Default implementation does nothing.
   */
  protected initDriveFS(options: IDriveFSOptions): void {}
}
