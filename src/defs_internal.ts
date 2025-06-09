import { ProxyMarked, Remote } from 'comlink';

import { IWorkerIO } from './buffered_io';
import { IInitDriveFSCallback, IOutputCallback } from './callback';
import {
  ICallExternalCommand,
  IDownloadModuleCallback,
  IEnableBufferedStdinCallback,
  ISetMainIOCallback,
  ITerminateCallback
} from './callback_internal';
import { IStdinContext } from './context';
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
  externalInput(maxChars: number | null): Promise<string>;
  externalOutput(text: string, isStderr: boolean): void;
  input(char: string): Promise<void>;
  setSize(rows: number, columns: number): Promise<void>;
  start(): Promise<void>;
}

export interface IShellWorker extends IShellCommon {
  // Handle any lazy initialization activities.
  // Callback proxies need to be separate arguments, they cannot be in IOptions.
  initialize(
    options: IShellWorker.IOptions,
    callExternalCommand: IShellWorker.IProxyCallExternalCommand,
    downloadModuleCallback: IShellWorker.IProxyDownloadModuleCallback,
    enableBufferedStdinCallback: IShellWorker.IProxyEnableBufferedStdinCallback,
    outputCallback: IShellWorker.IProxyOutputCallback,
    setMainIOCallback: IShellWorker.IProxySetMainIOCallback,
    terminateCallback: IShellWorker.IProxyTerminateCallback
  ): void;
  registerExternalCommand(name: string): boolean;
}

export namespace IShellWorker {
  export interface IProxyCallExternalCommand extends ICallExternalCommand, ProxyMarked {}
  export interface IProxyDownloadModuleCallback extends IDownloadModuleCallback, ProxyMarked {}
  export interface IProxyEnableBufferedStdinCallback
    extends IEnableBufferedStdinCallback,
      ProxyMarked {}
  export interface IProxyOutputCallback extends IOutputCallback, ProxyMarked {}
  export interface IProxySetMainIOCallback extends ISetMainIOCallback, ProxyMarked {}
  export interface IProxyTerminateCallback extends ITerminateCallback, ProxyMarked {}

  export interface IOptions extends IOptionsCommon {
    sharedArrayBuffer?: SharedArrayBuffer; // If set, supports bufferedIO via SharedArrayBuffer
    supportsServiceWorker: boolean;
  }
}

export type IRemoteShell = Remote<IShellWorker>;

export namespace IShellImpl {
  export interface IOptions extends IOptionsCommon {
    callExternalCommand: IShellWorker.IProxyCallExternalCommand;
    downloadModuleCallback: IShellWorker.IProxyDownloadModuleCallback;
    enableBufferedStdinCallback: IEnableBufferedStdinCallback;
    initDriveFSCallback: IInitDriveFSCallback;
    terminateCallback: IShellWorker.IProxyTerminateCallback;
    workerIO: IWorkerIO;
    stdinContext: IStdinContext;
  }
}
