/**
 * Context for running external command.
 * This exists in the main UI thread unlike other contexts that exist in the webworker.
 */

import type { ISizeCallback } from '../callback';
import type { ExternalEnvironment } from '../external_environment';
import type { IExternalInput, IExternalOutput } from '../io';
import type { IPosixSignalCallback } from '../posix_signal';
import type { Termios } from '../termios';

/**
 * Context used to run an external command.
 */
export interface IExternalRunContext {
  name: string;
  args: string[];
  environment: ExternalEnvironment;

  /**
   * Register a callback to be notified of POSIX signals such as SIGWINCH, replacing any previously
   * registered callback. The callback must not read from stdin.
   */
  onPosixSignal(callback: IPosixSignalCallback): void;

  shellId: string;
  stdin: IExternalInput;
  stdout: IExternalOutput;
  stderr: IExternalOutput;
  size: ISizeCallback;
  termios: Termios.ITermios;
}

/**
 * Context used to tab complete and external command.
 */
export interface IExternalTabCompleteContext {
  name: string;
  /**
   * Command arguments. The last argument is the one to tab complete and may be an empty string.
   */
  args: string[];

  shellId: string;
}
