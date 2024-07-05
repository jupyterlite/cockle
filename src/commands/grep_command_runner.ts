import * as GrepModule from "../wasm/grep"
import { WasmCommandRunner } from "./wasm_command_runner"

export class GrepCommandRunner extends WasmCommandRunner {
  names(): string[] {
    return ["grep"]
  }

  protected _getWasmModule(): any {
    return GrepModule.default
  }
}
