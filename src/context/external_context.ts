/**
 * Context for running external command.
 * This exists in the main UI thread unlike other contexts that exist in the webworker.
 */

import { ExternalOutput } from '../io';

export interface IExternalContext {
  args: string[];
  environment: Map<string, string>;
  stdout: ExternalOutput;
  stderr: ExternalOutput;
}
