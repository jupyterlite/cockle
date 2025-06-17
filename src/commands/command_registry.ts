import { CommandModule } from './command_module';
import { CommandPackage } from './command_package';
import { ICommandRunner } from './command_runner';
import { ExternalCommandRunner } from './external_command_runner';
import * as AllBuiltinCommands from '../builtin';
import { ICallExternalCommand } from '../callback_internal';

export class CommandRegistry {
  constructor(readonly callExternalCommand: ICallExternalCommand) {
    this.registerBuiltinCommands(AllBuiltinCommands);
  }

  /**
   * Return sequence of all command names in alphabetical order.
   */
  allCommands(): string[] {
    const commands = Array.from(this._map.keys());
    commands.sort();
    return commands;
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
   * Return the ICommandRunner for a particular named function, or null if no such name exists.
   * Note it does not load the module, that occurs when the command is run.
   */
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

  registerExternalCommand(name: string): void {
    // Overwrite if name already registered.
    this._map.set(name, new ExternalCommandRunner(name, this.callExternalCommand));
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
