import { Aliases } from './aliases';
import { IWorkerIO } from './buffered_io';
import { ITerminateCallback } from './callback';
import { History } from './history';
import { IInput, IOutput } from './io';
import { CommandModuleCache } from './commands/command_module_cache';
import { CommandRegistry } from './commands/command_registry';
import { IJavaScriptContext } from './javascript_context';

/**
 * Full context used to run builtin and WebAssembly commands.
 */
export interface IContext extends IJavaScriptContext {
  aliases: Aliases;
  commandRegistry: CommandRegistry;
  history: History;
  terminate: ITerminateCallback;
  stdin: IInput;
  stdout: IOutput;
  stderr: IOutput;
  workerIO: IWorkerIO;
  commandModuleCache: CommandModuleCache;
}
