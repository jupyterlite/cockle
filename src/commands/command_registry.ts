import { CommandModule } from './command_module';
import { CommandPackage } from './command_package';
import { ICommandRunner } from './command_runner';
import * as AllBuiltinCommands from '../builtin';

export class CommandRegistry {
  constructor() {
    this.registerBuiltinCommands(AllBuiltinCommands);
  }

  /**
   * Return sequence of all modules ordered by module name.
   */
  allModules(): CommandModule[] {
    const modules: CommandModule[] = [];
    for (const pkg of this.commandPackageMap.values()) {
      modules.push(...pkg.modules);
    }
    modules.sort((a, b) => (a.name < b.name ? -1 : 1));
    return modules;
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

  registerCommandPackage(commandPackage: CommandPackage) {
    // Check for duplicates?????
    this.commandPackageMap.set(commandPackage.name, commandPackage);
    for (const module of commandPackage.modules) {
      this._register(module.runner);
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

  // CommandPackages indexed by package name.
  commandPackageMap: Map<string, CommandPackage> = new Map();
}
