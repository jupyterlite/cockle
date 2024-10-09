import { WasmCommandModule } from './wasm_command_module';

/**
 * An emscripten-forge package that contains one or more WasmCommandModules.
 */
export class WasmCommandPackage {
  constructor(
    readonly name: string,
    readonly version: string,
    readonly build_string: string,
    readonly channel: string,
    readonly platform: string,
    readonly modules: WasmCommandModule[]
  ) {}
}
