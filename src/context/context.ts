import { IStdinContext } from './stdin_context';
import { Aliases } from '../aliases';
import { IWorkerIO } from '../buffered_io';
import { ITerminateCallback } from '../callback_internal';
import { Environment } from '../environment';
import { IFileSystem } from '../file_system';
import { History } from '../history';
import { IInput, IOutput } from '../io';
import { CommandModuleCache } from '../commands/command_module_cache';
import { CommandRegistry } from '../commands/command_registry';

/**
 * Full context used to run builtin and WebAssembly commands.
 */
export interface IContext {
  name: string;
  args: string[];
  fileSystem: IFileSystem;
  environment: Environment;
  aliases: Aliases;
  commandRegistry: CommandRegistry;
  history: History;
  terminate: ITerminateCallback;
  stdin: IInput;
  stdout: IOutput;
  stderr: IOutput;
  workerIO: IWorkerIO;
  commandModuleCache: CommandModuleCache;
  stdinContext: IStdinContext;
}
