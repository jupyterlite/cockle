import { ProxyMarked, Remote } from 'comlink';

import { IWorkerIO } from './buffered_io';
import {
  IDownloadModuleCallback,
  IEnableBufferedStdinCallback,
  IInitDriveFSCallback,
  IOutputCallback,
  IStdinCallback,
  IStdinAsyncCallback,
  ITerminateCallback
} from './callback';
import { IShell } from './defs';

interface IOptionsCommon {
  shellId: string;
  color: boolean;
  mountpoint?: string;
  baseUrl: string;
  wasmBaseUrl: string;
  browsingContextId?: string;
  // Initial directories and files to create, for testing purposes.
  initialDirectories?: string[];
  initialFiles?: IShell.IFiles;
}

interface IShellCommon {
  input(char: string): Promise<void>;
  setSize(rows: number, columns: number): Promise<void>;
  start(): Promise<void>;
}

export interface IShellWorker extends IShellCommon {
  // Handle any lazy initialization activities.
  // Callback proxies need to be separate arguments, they cannot be in IOptions.
  initialize(
    options: IShellWorker.IOptions,
    downloadModuleCallback: IShellWorker.IProxyDownloadModuleCallback,
    enableBufferedStdinCallback: IShellWorker.IProxyEnableBufferedStdinCallback,
    outputCallback: IShellWorker.IProxyOutputCallback,
    terminateCallback: IShellWorker.IProxyTerminateCallback
  ): void;
}

export namespace IShellWorker {
  export interface IProxyDownloadModuleCallback extends IDownloadModuleCallback, ProxyMarked {}
  export interface IProxyEnableBufferedStdinCallback
    extends IEnableBufferedStdinCallback,
      ProxyMarked {}
  export interface IProxyOutputCallback extends IOutputCallback, ProxyMarked {}
  export interface IProxyTerminateCallback extends ITerminateCallback, ProxyMarked {}

  export interface IOptions extends IOptionsCommon {
    sharedArrayBuffer: SharedArrayBuffer;
  }
}

export type IRemoteShell = Remote<IShellWorker>;

export namespace IShellImpl {
  export interface IOptions extends IOptionsCommon {
    downloadModuleCallback: IShellWorker.IProxyDownloadModuleCallback;
    enableBufferedStdinCallback: IEnableBufferedStdinCallback;
    initDriveFSCallback: IInitDriveFSCallback;
    stdinCallback: IStdinCallback;
    stdinAsyncCallback: IStdinAsyncCallback;
    terminateCallback: IShellWorker.IProxyTerminateCallback;
    workerIO: IWorkerIO;
  }
}
