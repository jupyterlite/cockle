/**
 * Callbacks visible in the frontend by Shell clients.
 */

import type { IDriveFSOptions } from './drive_fs';

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

/**
 * Return window size as [rows, columns] where rows and columns are integers >= 0.
 * If the size is unknown they will be zero.
 */
export interface ISizeCallback {
  (): [number, number];
}
