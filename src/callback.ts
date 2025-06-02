/**
 * Callbacks used by a shell to call functions in the frontend.
 */

import { IDriveFSOptions } from './drive_fs';

/**
 * Send output string to be displayed in terminal.
 */
export interface IOutputCallback {
  (output: string): void;
}

/**
 * Initialise DriveFS to mount external drive into the shell's filesystem.
 */
export interface IInitDriveFSCallback {
  (options: IDriveFSOptions): void;
}
