/**
 * Context for running external command.
 * This exists in the main UI thread unlike other contexts that exist in the webworker.
 */

import { ExternalEnvironment } from '../external_environment';
import { IExternalInput, IExternalOutput } from '../io';

/**
 * Context used to run an external command.
 */
export interface IExternalContext {
  name: string;
  args: string[];
  environment: ExternalEnvironment;
  stdin: IExternalInput;
  stdout: IExternalOutput;
  stderr: IExternalOutput;
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
}
