import type { Remote } from 'comlink';
import type { IWorkerIO } from './buffered_io';
import type {
  IInitDriveFSCallback,
  IOutputCallback,
  IQueryParamsCallback,
  ISize
} from './callback';
import type {
  ICallExternalCommand,
  ICallExternalTabComplete,
  IDownloadModuleCallback,
  IEnableBufferedStdinCallback,
  ISetMainIOCallback,
  ITerminateCallback
} from './callback_internal';
import type { IStdinContext } from './context';
import type { IShell } from './defs';
import type { Termios } from './termios';

/**
 * Representation of external commmand in the web worker, real external commands exists in the
 * main UI thread.
 */
export interface IExternalCommandConfig {
  name: string;
  hasTabComplete: boolean;
}

interface IOptionsCommon {
  shellId: string;
  color: boolean;
  mountpoint?: string;
  cwd?: string;
  baseUrl: string;
  wasmBaseUrl: string;
  browsingContextId?: string;
  aliases: { [key: string]: string };
  environment: { [key: string]: string | undefined };
  externalCommandConfigs: IExternalCommandConfig[];

  // Initial directories and files to create, for testing purposes.
  initialDirectories?: string[];
  initialFiles?: IShell.IFiles;
}

interface IShellCommon {
  // Handle any lazy initialization activities.
  // Callback proxies need to be separate arguments, they cannot be in IOptions.
  initialize(
    options: IShellWorker.IOptions,
    callExternalCommand: ICallExternalCommand,
    callExternalTabComplete: ICallExternalTabComplete,
    downloadModuleCallback: IDownloadModuleCallback,
    enableBufferedStdinCallback: IEnableBufferedStdinCallback,
    outputCallback: IOutputCallback,
    setMainIOCallback: ISetMainIOCallback,
    terminateCallback: ITerminateCallback,
    wasmUrlQueryParamsCallback?: IQueryParamsCallback
  ): void;

  exitCode: number;
  externalInput(maxChars: number | null): Promise<string>;
  externalOutput(text: string, isStderr: boolean): void;
  input(char: string): Promise<void>;
  setSize(size: ISize): void;
  start(): Promise<void>;
  themeChange(isDark?: boolean): Promise<void>;
}

export interface IShellWorker extends IShellCommon {
  externalSetTermios(flags: Termios.IFlags): void;
}

export interface IShellImpl extends IShellCommon {}

export namespace IShellWorker {
  export interface IOptions extends IOptionsCommon {
    sharedArrayBuffer?: SharedArrayBuffer; // If set, supports bufferedIO via SharedArrayBuffer
    supportsServiceWorker: boolean;
  }
}

export type IRemoteShell = Remote<IShellWorker>;

export namespace IShellImpl {
  export interface IOptions extends IOptionsCommon {
    callExternalCommand: ICallExternalCommand;
    callExternalTabComplete: ICallExternalTabComplete;
    downloadModuleCallback: IDownloadModuleCallback;
    enableBufferedStdinCallback: IEnableBufferedStdinCallback;
    initDriveFSCallback: IInitDriveFSCallback;
    terminateCallback: ITerminateCallback;
    workerIO: IWorkerIO;
    stdinContext: IStdinContext;
    termios: Termios.Termios;
    wasmUrlQueryParamsCallback?: IQueryParamsCallback;
  }
}
