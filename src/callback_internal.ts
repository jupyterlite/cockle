import type { IOutputCallback, IQueryParamsCallback } from './callback';
import type { IExternalTabCompleteResult } from './external_command';
import type { Termios } from './termios';

/**
 * Internal callbacks used by a shell impl/worker to call functions in the shell.
 */

/**
 * Internal caller (from ShellImpl/ShellWorker to Shell) to run external command.
 * An external command is called via ICallExternalCommand and the exit code is awaited. But witin
 * cockle this is implemented as a call to start the command sent from the web worker to the main UI
 * thread, and a call when the command exits in the other direction. This is to avoid awaiting the
 * end of the command whilst potentially passing other information between the two threads such as
 * for stdin, which can be problematic for coincident (SharedArrayBuffer) web worker comms.
 */
export interface IExitExternalCommand {
  exitCode: number;
  environmentChanges?: Record<string, string | undefined>;
}

export interface ICallExternalCommand {
  (
    name: string,
    args: string[],
    environment: Record<string, string>,
    stdinIsTerminal: boolean,
    stdoutIsTerminal: boolean,
    stderrIsTerminal: boolean,
    termiosFlags: Termios.IFlags
  ): Promise<IExitExternalCommand>;
}

export interface ICallExternalCommandNoReturn {
  (
    name: string,
    args: string[],
    environment: Record<string, string>,
    stdinIsTerminal: boolean,
    stdoutIsTerminal: boolean,
    stderrIsTerminal: boolean,
    termiosFlags: Termios.IFlags
  ): void;
}

export interface ICallExternalTabComplete {
  (name: string, args: string[]): Promise<IExternalTabCompleteResult>;
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

export interface IPollCallback {
  (timeoutMs: number): boolean;
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

/**
 * Callbacks in the shell worker, to call functions in the shall.
 */
export interface IWorkerCallbacks {
  callExternalCommand: ICallExternalCommandNoReturn;
  callExternalTabComplete: ICallExternalTabComplete;
  downloadModuleCallback: IDownloadModuleCallback;
  enableBufferedStdinCallback: IEnableBufferedStdinCallback;
  outputCallback: IOutputCallback;
  setMainIOCallback: ISetMainIOCallback;
  terminateCallback: ITerminateCallback;
  wasmUrlQueryParamsCallback?: IQueryParamsCallback;
}
