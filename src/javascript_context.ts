import { Environment } from './environment';
import { IFileSystem } from './file_system';
import { IJavaScriptInput, IOutput } from './io';

/**
 * Mininal context used to run imported JavaScript commands.
 */
export interface IJavaScriptContext {
  args: string[];
  fileSystem: IFileSystem;
  environment: Environment;
  stdin: IJavaScriptInput;
  stdout: IOutput;
  stderr: IOutput;
}
