import { WasmCommandRunner } from './wasm_command_runner';
import { WasmLoader } from '../wasm_loader';

export class LuaCommandRunner extends WasmCommandRunner {
  constructor(wasmLoader: WasmLoader) {
    super(wasmLoader);
  }

  moduleName(): string {
    return 'lua';
  }

  names(): string[] {
    return ['lua'];
  }
}
