import type { IServices } from './services';
import type { ISizeCallback } from '../callback';
import type { Environment } from '../environment';
import type { IFileSystem } from '../file_system';
import type { IJavaScriptInput, IOutput } from '../io';
import type { IPosixSignalCallback } from '../posix_signal';
import type { Termios } from '../termios';

/**
 * Mininal context used to run imported JavaScript commands.
 */
export interface IJavaScriptRunContext {
  name: string;
  args: string[];
  fileSystem: IFileSystem;
  environment: Environment;

  /**
   * Register a callback to be notified of POSIX signals such as SIGWINCH, replacing any previously
   * registered callback. The callback must not read from stdin.
   */
  onPosixSignal(callback: IPosixSignalCallback): void;

  /**
   * Services provided by cockle at runtime, such as a pager. Use these rather than importing and
   * bundling them, so that the command uses the implementation of the cockle it is running in.
   */
  services: IServices;

  shellId: string;
  stdin: IJavaScriptInput;
  stdout: IOutput;
  stderr: IOutput;
  size: ISizeCallback;
  termios: Termios.ITermios;
}

/**
 * Mininal context used to run imported JavaScript commands.
 */
export interface IJavaScriptTabCompleteContext {
  name: string;
  /**
   * Command arguments. The last argument is the one to tab complete and may be an empty string.
   */
  args: string[];

  shellId: string;
}
