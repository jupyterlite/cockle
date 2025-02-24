import { Aliases } from './aliases';
import { WorkerBufferedIO } from './buffered_io';
import { ITerminateCallback } from './callback';
import { Environment } from './environment';
import { History } from './history';
import { IFileSystem } from './file_system';
import { IInput, IOutput } from './io';
import { CommandModuleCache } from './commands/command_module_cache';
import { CommandRegistry } from './commands/command_registry';

/**
 * Context used to run commands.
 */
export interface IContext {
  args: string[];
  fileSystem: IFileSystem;
  aliases: Aliases;
  commandRegistry: CommandRegistry;
  environment: Environment;
  history: History;
  terminate: ITerminateCallback;
  stdin: IInput;
  stdout: IOutput;
  stderr: IOutput;
  bufferedIO: WorkerBufferedIO;
  commandModuleCache: CommandModuleCache;
}
