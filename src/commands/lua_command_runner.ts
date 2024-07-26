import * as LuaModule from "../wasm/lua.js"
import { WasmCommandRunner } from "./wasm_command_runner"

export class LuaCommandRunner extends WasmCommandRunner {
  names(): string[] {
    return ["lua"]
  }

  protected _getWasmModule(): any {
    return LuaModule.default
  }
}
