/**
 * Context for running external command.
 * This exists in the main UI thread unlike other contexts that exist in the webworker.
 */

import { ExternalEnvironment } from '../external_environment';
import { IExternalInput, IExternalOutput } from '../io';
import { Termios } from '../termios';

/**
 * Context used to run an external command.
 */
export interface IExternalRunContext {
  name: string;
  args: string[];
  environment: ExternalEnvironment;
  shellId: string;
  stdin: IExternalInput;
  stdout: IExternalOutput;
  stderr: IExternalOutput;
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
