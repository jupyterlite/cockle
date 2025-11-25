import type { CommandModule } from './command_module';
import type { CommandPackage } from './command_package';
import type { ICommandRunner } from './command_runner';
import { CommandType } from './command_type';
import { ExternalCommandRunner } from './external_command_runner';
import * as AllBuiltinCommands from '../builtin';
import type { ICallExternalCommand, ICallExternalTabComplete } from '../callback_internal';

export class CommandRegistry {
  constructor(
    readonly callExternalCommand: ICallExternalCommand,
    readonly callExternalTabComplete: ICallExternalTabComplete
  ) {
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

  /**
   * Return sequence of command names, optionally filtered by commandType.
   */
  commandNames(commandType: CommandType = CommandType.All): string[] {
    if (commandType === CommandType.None) {
      return [];
    } else if (commandType === CommandType.All) {
      // Avoid the filter below.
      return Array.from(this._map.keys()).sort();
    } else {
      // Filter by commandType.
      return Array.from(this._map)
        .filter(([name, runner]) => (runner.commandType & commandType) > 0)
        .map(([name, runner]) => name)
        .sort();
    }
  }

  /**
   * Return the ICommandRunner for a particular named function, or null if no such name exists.
   * Note it does not load the module, that occurs when the command is run.
   */
  get(name: string): ICommandRunner | null {
    return this._map.get(name) ?? null;
  }

  match(start: string, commandType: CommandType = CommandType.All): string[] {
    return this.commandNames(commandType).filter(name => name.startsWith(start));
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

  registerExternalCommand(name: string, hasTabComplete: boolean): void {
    // Overwrite if name already registered.
    this._map.set(
      name,
      new ExternalCommandRunner(
        name,
        this.callExternalCommand,
        hasTabComplete ? this.callExternalTabComplete : undefined
      )
    );
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
