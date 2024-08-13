import { ICommandRunner } from './commands/command_runner';
import { CoreutilsCommandRunner } from './commands/coreutils_command_runner';
import { GrepCommandRunner } from './commands/grep_command_runner';
import * as AllBuiltinCommands from './builtin';
import { WasmLoader } from './wasm_loader';

export class CommandRegistry {
  constructor(wasmLoader: WasmLoader) {
    this.registerBuiltinCommands(AllBuiltinCommands);

    this._commandRunners = [
      new CoreutilsCommandRunner(wasmLoader),
      new GrepCommandRunner(wasmLoader)
    ];

    // Command name -> runner mapping
    // Should probably check not overwriting any command names
    for (const runner of this._commandRunners) {
      for (const name of runner.names()) {
        this._map.set(name, runner);
      }
    }
  }

  get(name: string): ICommandRunner | null {
    return this._map.get(name) ?? null;
  }

  match(start: string): string[] {
    return [...this._map.keys()].filter(name => name.startsWith(start)).sort();
  }

  /**
   * Register a command runner under a single name.
   */
  register(name: string, commandRunner: ICommandRunner) {
    this._map.set(name, commandRunner);
  }

  registerBuiltinCommands(commands: any) {
    for (const [key, cls] of Object.entries(commands)) {
      if (!key.endsWith('Command') || key.startsWith('Builtin')) {
        continue;
      }
      try {
        const obj = new (cls as any)();
        if (obj instanceof AllBuiltinCommands.BuiltinCommand) {
          this.register(obj.name, obj);
        }
      } catch {
        // If there is any problem registering a command runner this way, silently fail.
      }
    }
  }

  private _commandRunners: ICommandRunner[];
  private _map: Map<string, ICommandRunner> = new Map();
}
