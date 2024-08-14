import { WasmCommandRunner } from './wasm_command_runner';
import { WasmLoader } from '../wasm_loader';

export class GrepCommandRunner extends WasmCommandRunner {
  constructor(wasmLoader: WasmLoader) {
    super(wasmLoader);
  }

  moduleName(): string {
    return 'grep';
  }

  names(): string[] {
    return ['grep'];
  }
}
