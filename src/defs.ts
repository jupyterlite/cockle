import { IObservableDisposable } from '@lumino/disposable';

import {
  IEnableBufferedStdinCallback,
  IOutputCallback,
  IStdinCallback,
  ITerminateCallback
} from './callback';

import { ProxyMarked, Remote } from 'comlink';

interface IOptionsCommon {
  color?: boolean;
  mountpoint?: string;
  wasmBaseUrl: string;
  driveFsBaseUrl?: string;
  // Initial directories and files to create, for testing purposes.
  initialDirectories?: string[];
  initialFiles?: IShell.IFiles;
}

export interface IShellCommon {
  input(char: string): Promise<void>;
  setSize(rows: number, columns: number): Promise<void>;
  start(): Promise<void>;
}

export interface IShell extends IObservableDisposable, IShellCommon {}

export namespace IShell {
  export interface IOptions extends IOptionsCommon {
    outputCallback: IOutputCallback;
  }

  export type IFiles = { [key: string]: string };
}

export interface IShellWorker extends IShellCommon {
  // Handle any lazy initialization activities.
  // Callback proxies need to be separate arguments, they cannot be in IOptions.
  initialize(
    options: IShellWorker.IOptions,
    outputCallback: IShellWorker.IProxyOutputCallback,
    enableBufferedStdinCallback: IShellWorker.IProxyEnableBufferedStdinCallback,
    terminateCallback: IShellWorker.IProxyTerminateCallback
  ): void;
}

export namespace IShellWorker {
  export interface IProxyOutputCallback extends IOutputCallback, ProxyMarked {}
  export interface IProxyEnableBufferedStdinCallback
    extends IEnableBufferedStdinCallback,
      ProxyMarked {}
  export interface IProxyTerminateCallback extends ITerminateCallback, ProxyMarked {}

  export interface IOptions extends IOptionsCommon {
    sharedArrayBuffer: SharedArrayBuffer;
  }
}

export type IRemoteShell = Remote<IShellWorker>;

export namespace IShellImpl {
  export interface IOptions extends IOptionsCommon {
    outputCallback: IOutputCallback;
    enableBufferedStdinCallback: IEnableBufferedStdinCallback;
    stdinCallback: IStdinCallback;
    terminateCallback: IShellWorker.IProxyTerminateCallback;
  }
}
