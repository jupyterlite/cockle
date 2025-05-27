/**
 * Callbacks used by a shell to call functions in the frontend.
 */

import { IExternalContext } from './context';
import { IDriveFSOptions } from './drive_fs';

/**
 * Run an external command from the Shell.
 */
export interface IExternalCommand {
  (context: IExternalContext): Promise<number>;
}

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
