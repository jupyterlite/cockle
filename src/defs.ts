import { IObservableDisposable } from '@lumino/disposable';

import { IOutputCallback } from './callback';

export interface IShell extends IObservableDisposable {
  input(char: string): Promise<void>;
  setSize(rows: number, columns: number): Promise<void>;
  start(): Promise<void>;
}

export namespace IShell {
  export interface IOptions {
    color?: boolean;
    mountpoint?: string;
    wasmBaseUrl: string;
    driveFsBaseUrl?: string;
    // Initial directories and files to create, for testing purposes.
    initialDirectories?: string[];
    initialFiles?: IShell.IFiles;

    outputCallback: IOutputCallback;
  }

  export type IFiles = { [key: string]: string };
}
