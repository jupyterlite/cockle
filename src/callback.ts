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
 * Callback for start and end of downloading a JavaScript/WebAssembly module so that frontend can
 * inform the user.
 */
export interface IDownloadModuleCallback {
  (packageName: string, moduleName: string, start: boolean): void;
}

/**
 * Enable/disable buffered stdin.
 */
export interface IEnableBufferedStdinCallback {
  (enable: boolean): Promise<void>;
}

/**
 * Initialise DriveFS to mount external drive into the shell's filesystem.
 */
export interface IInitDriveFSCallback {
  (options: IDriveFSOptions): void;
}

/**
 * Callback for worker to set IMainIO, to switch between SharedArrayBuffer and ServiceWorker.
 */
export interface ISetMainIOCallback {
  (shortName: string): void;
}

/**
 * Wait for and return a sequence of utf16 code units from stdin, if buffered stdin is enabled.
 * Return up to maxChars, or all available characters if maxChars is null.
 */
export interface IStdinCallback {
  (maxChars: number | null): number[];
}

export interface IStdinAsyncCallback {
  (maxChars: number | null): Promise<number[]>;
}

/**
 * Request to terminate the shell.
 */
export interface ITerminateCallback {
  (): void;
}
