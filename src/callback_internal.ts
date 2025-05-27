/**
 * Internal callbacks used by a shell impl/worker to call functions in the shell.
 */

/**
 * Internal caller (from ShellImpl/ShellWorker to Shell) to run external command.
 */
export interface ICallExternalCommand {
  (
    name: string,
    args: string[],
    environment: Map<string, string>,
    stdoutSupportsAnsiEscapes: boolean,
    stderrSupportsAnsiEscapes: boolean
  ): Promise<{ exitCode: number; newEnvironment?: Map<string, string> }>;
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
