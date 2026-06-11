import type { IObservableDisposable } from '@lumino/disposable';
import type { IHandleStdin, IStdinReply, IStdinRequest } from './buffered_io';
import type { IOutputCallback, IQueryParamsCallback } from './callback';
import type { IExternalCommand } from './external_command';

export interface IShell extends IObservableDisposable {
  /**
   * Return exit code of last command run.
   */
  exitCode(): Promise<number>;

  /**
   * Input characters from a terminal to the shell.
   */
  input(char: string): Promise<void>;

  /**
   * Return promise that resolves when the shell is ready to accept input.
   */
  ready: Promise<void>;

  /**
   * Set the size of the shell.
   */
  setSize(rows: number, columns: number): Promise<void>;

  /**
   * String identifier for the shell, must be unique within a browser tab.
   */
  shellId: string;

  /**
   * Return the size (rows, columns) of the shell, as set by previous `setSize` call.
   */
  size: [number, number];

  /**
   * Start the shell, so that it is ready to accept input.
   */
  start(): Promise<void>;

  /**
   * Call just after theme change so the shell knows whether it is using dark or light mode.
   * If the dark/light mode is not specified then the shell will ask the terminal what the
   * background color is to determine it.
   */
  themeChange(isDark?: boolean): void;
}

export namespace IShell {
  export interface IOptions {
    /**
     * Optional string identifier. If specified must be unique within a browser tab.
     */
    shellId?: string;

    /**
     * Whether to enable color in the shell, along with various interactive terminal features.
     * If not specified, defaults to `true`.
     */
    color?: boolean;

    /**
     * Optional mount point of shared filesystem drive.
     */
    mountpoint?: string;

    /**
     * Optional current working directory.
     */
    cwd?: string;

    /**
     * Base URL used for stdin and DriveFS requests via ServiceWorker.
     */
    baseUrl: string;

    /**
     * Base URL used for fetching WebAssembly and JavaScript command files, and
     * `cockle-config.json`.
     */
    wasmBaseUrl: string;

    /**
     * Optional callback to return the query parameters to append to the URL when cockle fetches a
     * file at runtime such as a WebAssembly or JavaScript command package, or `cockle-config.json`.
     * The callback is only called for `.js` and `.json` files. Separate fetches for `.wasm` and
     * `.data` files that are autoloaded for WebAssembly command packages do not use query
     * parameters.
     */
    wasmUrlQueryParams?: IQueryParamsCallback;

    /**
     * Unique string used to identify shell in Service Worker stdin and drive requests.
     */
    browsingContextId?: string;

    /**
     * Optional shell manager to register this shell with.
     * Required for stdin to work via Service Worker.
     */
    shellManager?: IShellManager;

    /**
     * Aliases to set in shell at startup.
     */
    aliases?: { [key: string]: string };

    /**
     * Environment variables to set in shell at startup.
     */
    environment?: { [key: string]: string | undefined };

    /**
     * External commands to register in shell at startup.
     */
    externalCommands?: IExternalCommand.IOptions[];

    /**
     * Initial directories to create in file system, used for testing purposes.
     */
    initialDirectories?: string[];

    /**
     * Initial files to create in file system, used for testing purposes.
     */
    initialFiles?: IShell.IFiles;

    /**
     * Callback to handle output from the shell, for display in a terminal for example.
     */
    outputCallback: IOutputCallback;
  }

  export type IFiles = { [key: string]: string };
}

export interface IShellManager {
  handleStdin(request: IStdinRequest): Promise<IStdinReply>;
  registerShell(shellId: string, shell: IShell, handleStdin: IHandleStdin): void;
  shellIds(): string[];
}
