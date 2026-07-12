import type { Remote } from 'comlink';
import type { IWorkerIO } from './buffered_io';
import type {
  IInitDriveFSCallback,
  IOutputCallback,
  IQueryParamsCallback,
  ISize
} from './callback';
import type {
  ICallExternalCommandNoReturn,
  ICallExternalTabComplete,
  IDownloadModuleCallback,
  IEnableBufferedStdinCallback,
  IExternalCommandResult,
  IExternalInputReturnCallback,
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
  aliases: Record<string, string>;
  environment: Record<string, string | undefined>;
  externalCommandConfigs: IExternalCommandConfig[];

  // Initial directories and files to create, for testing purposes.
  initialDirectories?: string[];
  initialFiles?: IShell.IFiles;
}

// Common means common to both ShellWorker and ShellImpl.
interface IShellCommon {
  exitCode(): number;
  exitExternalCommand(result: IExternalCommandResult): void;
  externalOutput(text: string, isStderr: boolean): void;
  input(char: string): Promise<void>;
  setSize(size: ISize): void;
  start(): Promise<void>;
  themeChange(isDark?: boolean): Promise<void>;
}

export interface IShellWorker extends IShellCommon {
  externalInput(maxChars: number | null): void;
  externalSetTermios(flags: Termios.IFlags): void;

  // Handle any lazy initialization activities.
  initialize(options: IShellWorker.IOptions): void;

  registerCallbacks(
    callExternalCommand: ICallExternalCommandNoReturn,
    callExternalTabComplete: ICallExternalTabComplete,
    downloadModuleCallback: IDownloadModuleCallback,
    enableBufferedStdinCallback: IEnableBufferedStdinCallback,
    externalInputReturn: IExternalInputReturnCallback,
    outputCallback: IOutputCallback,
    setMainIOCallback: ISetMainIOCallback,
    terminateCallback: ITerminateCallback,
    wasmUrlQueryParamsCallback?: IQueryParamsCallback
  ): void;
}

export interface IShellImpl extends IShellCommon {
  externalInput(maxChars: number | null): Promise<string>;
  initialize(): Promise<void>;
}

export namespace IShellWorker {
  export interface IOptions extends IOptionsCommon {
    sharedArrayBuffer?: SharedArrayBuffer; // If set, supports bufferedIO via SharedArrayBuffer
    supportsServiceWorker: boolean;
  }
}

export type IRemoteShell = Remote<IShellWorker>;

export namespace IShellImpl {
  export interface IOptions extends IOptionsCommon {
    callExternalCommand: ICallExternalCommandNoReturn;
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

export type WorkerType = 'coincident' | 'comlink';
