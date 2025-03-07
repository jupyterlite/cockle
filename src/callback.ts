/**
 * Callbacks used by a shell to call functions in the frontend.
 */

import { IFileSystem } from './file_system';

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
  (enable: boolean): void;
}

/**
 * Initialise DriveFS to mount external drive into the shell's filesystem.
 */
export interface IInitDriveFSCallback {
  (driveFsBaseUrl: string, mountpoint: string, fileSystem: IFileSystem): void;
}

/**
 * Wait for and return a sequence of utf16 code units from stdin, if buffered stdin is enabled.
 */
export interface IStdinCallback {
  (maxChars: number): number[];
}

/**
 * Request to terminate the shell.
 */
export interface ITerminateCallback {
  (): void;
}
