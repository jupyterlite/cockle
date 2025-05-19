import type { IObservableDisposable } from '@lumino/disposable';

import { IOutputCallback } from './callback';

export interface IShell extends IObservableDisposable {
  input(char: string): Promise<void>;
  setSize(rows: number, columns: number): Promise<void>;
  shellId: string;
  start(): Promise<void>;
}

export namespace IShell {
  export interface IOptions {
    shellId?: string;
    color?: boolean;
    mountpoint?: string;
    baseUrl: string;
    wasmBaseUrl: string;
    browsingContextId?: string;
    // Initial directories and files to create, for testing purposes.
    initialDirectories?: string[];
    initialFiles?: IShell.IFiles;

    outputCallback: IOutputCallback;
  }

  export type IFiles = { [key: string]: string };
}
