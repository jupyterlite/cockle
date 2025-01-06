/**
 * Callbacks used by a shell to call functions in the frontend.
 */

/**
 * Send output string to be displayed in terminal.
 */
export interface IOutputCallback {
  (output: string): void;
}

/**
 * Enable/disable buffered stdin.
 */
export interface IEnableBufferedStdinCallback {
  (enable: boolean): void;
}

/**
 * Wait for and return a sequence of utf16 code units from stdin, if buffered stdin is enabled.
 */
export interface IStdinCallback {
  (): number[];
}

/**
 * Request to terminate the shell.
 */
export interface ITerminateCallback {
  (): void;
}
