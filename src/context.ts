import { Aliases } from './aliases';
import { WorkerBufferedIO } from './buffered_io';
import { ITerminateCallback } from './callback';
import { CommandRegistry } from './command_registry';
import { Environment } from './environment';
import { History } from './history';
import { IFileSystem } from './file_system';
import { IInput, IOutput } from './io';
import { WasmModuleCache } from './wasm_module_cache';

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
  wasmModuleCache: WasmModuleCache;
}
