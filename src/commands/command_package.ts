import { CommandModule } from './command_module';

/**
 * A dynamically-loaded package that contains one or more JavaScript/WebAssembly CommandModules.
 * May correspond to an emscripten-forge package.
 */
export class CommandPackage {
  constructor(
    readonly name: string,
    readonly version: string,
    readonly build_string: string,
    readonly channel: string, // channel (emscripten-forge package) or local directory.
    readonly platform: string,
    readonly modules: CommandModule[]
  ) {}
}
