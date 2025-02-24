import { CommandModuleLoader } from './command_module_loader';
import { DynamicallyLoadedCommandRunner } from './dynamically_loaded_command_runner';
import { WasmCommandRunner } from './wasm_command_runner';

/**
 * A dynamically-loaded command module. This corresponds to a moduleName.js file which may contain
 * pure JavaScript code or may be backed by a moduleName.wasm file containing WebAssembly.
 * Contains zero or more string command names.
 */
export class CommandModule {
  constructor(
    readonly commandModuleLoader: CommandModuleLoader,
    readonly name: string,
    private readonly commands: string[],
    readonly packageName: string
  ) {}

  get loader(): CommandModuleLoader {
    return this.commandModuleLoader;
  }

  get runner(): DynamicallyLoadedCommandRunner {
    if (this._runner === undefined) {
      this._runner = new WasmCommandRunner(this);
    }
    return this._runner;
  }

  get moduleName(): string {
    return this.name;
  }

  get names(): string[] {
    return this.commands;
  }

  private _runner?: DynamicallyLoadedCommandRunner;
}
