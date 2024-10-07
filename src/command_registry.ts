import { ICommandRunner } from './commands/command_runner';
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

  /**
   * Register a command runner under all of its names.
   */
  register(commandRunner: ICommandRunner) {
    // Should probably check not overwriting any command names
    for (const name of commandRunner.names()) {
      this._map.set(name, commandRunner);
    }
  }

  registerBuiltinCommands(commands: any) {
    for (const [key, cls] of Object.entries(commands)) {
      if (!key.endsWith('Command') || key.startsWith('Builtin')) {
        continue;
      }
      try {
        const obj = new (cls as any)();
        if (obj instanceof AllBuiltinCommands.BuiltinCommand) {
          this.register(obj);
        }
      } catch {
        // If there is any problem registering a command runner this way, silently fail.
      }
    }
  }

  private _map: Map<string, ICommandRunner> = new Map();
}
