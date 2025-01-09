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
export class Context {
  constructor(
    readonly args: string[],
    readonly fileSystem: IFileSystem,
    readonly mountpoint: string,
    readonly aliases: Aliases,
    readonly commandRegistry: CommandRegistry,
    readonly environment: Environment,
    readonly history: History,
    readonly terminate: ITerminateCallback,
    readonly stdin: IInput,
    readonly stdout: IOutput,
    readonly stderr: IOutput,
    readonly bufferedIO: WorkerBufferedIO,
    readonly wasmModuleCache: WasmModuleCache
  ) {}

  flush(): void {
    this.stderr.flush();
    this.stdout.flush();
  }
}
