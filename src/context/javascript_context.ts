import { Environment } from '../environment';
import { IFileSystem } from '../file_system';
import { IJavaScriptInput, IOutput } from '../io';

/**
 * Mininal context used to run imported JavaScript commands.
 */
export interface IJavaScriptRunContext {
  name: string;
  args: string[];
  fileSystem: IFileSystem;
  environment: Environment;
  stdin: IJavaScriptInput;
  stdout: IOutput;
  stderr: IOutput;
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
}
