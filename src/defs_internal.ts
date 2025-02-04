import { WorkerBufferedIO } from './buffered_io';
import {
  IDownloadWasmModuleCallback,
  IEnableBufferedStdinCallback,
  IStdinCallback,
  ITerminateCallback
} from './callback';

import { IShell } from './defs';

import { ProxyMarked, Remote } from 'comlink';

interface IOptionsCommon {
  color: boolean;
  mountpoint?: string;
  wasmBaseUrl: string;
  driveFsBaseUrl?: string;
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
    downloadWasmModuleCallback: IShellWorker.IProxyDownloadWasmModuleCallback,
    enableBufferedStdinCallback: IShellWorker.IProxyEnableBufferedStdinCallback,
    terminateCallback: IShellWorker.IProxyTerminateCallback
  ): void;
}

export namespace IShellWorker {
  export interface IProxyDownloadWasmModuleCallback
    extends IDownloadWasmModuleCallback,
      ProxyMarked {}
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
    downloadWasmModuleCallback: IShellWorker.IProxyDownloadWasmModuleCallback;
    enableBufferedStdinCallback: IEnableBufferedStdinCallback;
    stdinCallback: IStdinCallback;
    terminateCallback: IShellWorker.IProxyTerminateCallback;
    bufferedIO: WorkerBufferedIO;
  }
}
