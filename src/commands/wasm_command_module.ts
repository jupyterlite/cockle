import { WasmCommandRunner } from './wasm_command_runner';
import { WasmModuleLoader } from '../wasm_module_loader';

/**
 * A moduleName.wasm file with its associated moduleName.js wrapper.
 * Contains zero or more string command names.
 */
export class WasmCommandModule extends WasmCommandRunner {
  constructor(
    wasmModuleLoader: WasmModuleLoader,
    readonly name: string,
    private readonly commands: string[],
    readonly packageName: string,
  ) {
    super(wasmModuleLoader);
  }

  moduleName(): string {
    return this.name;
  }

  names(): string[] {
    return this.commands;
  }
}
