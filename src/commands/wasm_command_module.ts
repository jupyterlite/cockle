import { WasmCommandRunner } from './wasm_command_runner';
import { WasmLoader } from '../wasm_loader';

/**
 * A moduleName.wasm file with its associated moduleName.js wrapper.
 * Contains zero or more string command names.
 */
export class WasmCommandModule extends WasmCommandRunner {
  constructor(
    wasmLoader: WasmLoader,
    private readonly name: string,
    private readonly commands: string[]
  ) {
    super(wasmLoader);
  }

  moduleName(): string {
    return this.name;
  }

  names(): string[] {
    return this.commands;
  }
}
