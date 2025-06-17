/**
 * Context for running external command.
 * This exists in the main UI thread unlike other contexts that exist in the webworker.
 */

import { ExternalEnvironment } from '../external_environment';
import { IExternalInput, IExternalOutput } from '../io';

export interface IExternalContext {
  name: string;
  args: string[];
  environment: ExternalEnvironment;
  stdin: IExternalInput;
  stdout: IExternalOutput;
  stderr: IExternalOutput;
}
