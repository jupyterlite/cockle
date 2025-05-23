import type { IObservableDisposable } from '@lumino/disposable';

import { IStdinHandler, IStdinReply, IStdinRequest } from './buffered_io';
import { IOutputCallback } from './callback';

export interface IShell extends IObservableDisposable {
  input(char: string): Promise<void>;
  setSize(rows: number, columns: number): Promise<void>;
  shellId: string;
  start(): Promise<void>;
}

export namespace IShell {
  export interface IOptions {
    shellId?: string; // Unique ID/name
    color?: boolean;
    mountpoint?: string;
    baseUrl: string;
    wasmBaseUrl: string;
    browsingContextId?: string;
    shellManager?: IShellManager; // If specified, register this shell with shellManager

    // Initial directories and files to create, for testing purposes.
    initialDirectories?: string[];
    initialFiles?: IShell.IFiles;

    outputCallback: IOutputCallback;
  }

  export type IFiles = { [key: string]: string };
}

export interface IShellManager {
  registerShell(shellId: string, shell: IShell, stdinHandler: IStdinHandler): void;
  stdinHandler(request: IStdinRequest): Promise<IStdinReply>;
}
