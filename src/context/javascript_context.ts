import type { ISizeCallback } from '../callback';
import type { Environment } from '../environment';
import type { IFileSystem } from '../file_system';
import type { IJavaScriptInput, IOutput } from '../io';
import type { Termios } from '../termios';

/**
 * Mininal context used to run imported JavaScript commands.
 */
export interface IJavaScriptRunContext {
  name: string;
  args: string[];
  fileSystem: IFileSystem;
  environment: Environment;
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
