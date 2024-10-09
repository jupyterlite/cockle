import { ICommandRunner } from './commands/command_runner';
import { WasmCommandPackage } from './commands/wasm_command_package';
import * as AllBuiltinCommands from './builtin';
import { WasmLoader } from './wasm_loader';

export class CommandRegistry {
  constructor(wasmLoader: WasmLoader) {
    this.registerBuiltinCommands(AllBuiltinCommands);
  }

  get(name: string): ICommandRunner | null {
    return this._map.get(name) ?? null;
  }

  match(start: string): string[] {
    return [...this._map.keys()].filter(name => name.startsWith(start)).sort();
  }

  registerBuiltinCommands(commands: any) {
    for (const [key, cls] of Object.entries(commands)) {
      if (!key.endsWith('Command') || key.startsWith('Builtin')) {
        continue;
      }
      try {
        const obj = new (cls as any)();
        if (obj instanceof AllBuiltinCommands.BuiltinCommand) {
          this._register(obj);
        }
      } catch {
        // If there is any problem registering a command runner this way, silently fail.
      }
    }
  }

  registerWasmCommandPackage(wasmCommandPackage: WasmCommandPackage) {
    // Check for duplicates?????
    this.wasmPackageMap.set(wasmCommandPackage.name, wasmCommandPackage);
    for (const module of wasmCommandPackage.modules) {
      this._register(module);
    }
  }

  /**
   * Register a command runner under all of its names.
   */
  private _register(commandRunner: ICommandRunner) {
    // Should probably check not overwriting any command names
    for (const name of commandRunner.names()) {
      this._map.set(name, commandRunner);
    }
  }

  // Map of command name to runner.
  private _map: Map<string, ICommandRunner> = new Map();

  // WasmCommandPackages indexed by package name.
  wasmPackageMap: Map<string, WasmCommandPackage> = new Map();
}
