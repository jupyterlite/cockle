import { IEnableBufferedStdinCallback, IOutputCallback, IStdinCallback } from './callback';

import { ProxyMarked, Remote } from 'comlink';

interface IOptionsCommon {
  color?: boolean;
  mountpoint?: string;
  driveFsBaseUrl?: string;
  // Initial directories and files to create, for testing purposes.
  initialDirectories?: string[];
  initialFiles?: IShell.IFiles;
}

export interface IShell {
  input(char: string): Promise<void>;
  setSize(rows: number, columns: number): Promise<void>;
  start(): Promise<void>;
}

export namespace IShell {
  export interface IOptions extends IOptionsCommon {
    outputCallback: IOutputCallback;
  }

  export type IFiles = { [key: string]: string };
}

export interface IShellWorker extends IShell {
  // Handle any lazy initialization activities.
  // Callback proxies need to be separate arguments, they cannot be in IOptions.
  initialize(
    options: IShellWorker.IOptions,
    outputCallback: IShellWorker.IProxyOutputCallback,
    enableBufferedStdinCallback: IShellWorker.IProxyEnableBufferedStdinCallback
  ): void;
}

export namespace IShellWorker {
  export interface IProxyOutputCallback extends IOutputCallback, ProxyMarked {}
  export interface IProxyEnableBufferedStdinCallback
    extends IEnableBufferedStdinCallback,
      ProxyMarked {}

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
  }
}
