import { ICommandRunner } from './commands/command_runner';
import { CoreutilsCommandRunner } from './commands/coreutils_command_runner';
import { GrepCommandRunner } from './commands/grep_command_runner';
import * as AllBuiltinCommands from './builtin';

export class CommandRegistry {
  private constructor() {
    this._commandRunners = [new CoreutilsCommandRunner(), new GrepCommandRunner()];

    // Command name -> runner mapping
    for (const runner of this._commandRunners) {
      for (const name of runner.names()) {
        this._map.set(name, runner);
      }
    }
  }

  get(name: string): ICommandRunner | null {
    return this._map.get(name) ?? null;
  }

  static instance(): CommandRegistry {
    if (!CommandRegistry._instance) {
      CommandRegistry._instance = new CommandRegistry();
    }
    return CommandRegistry._instance;
  }

  match(start: string): string[] {
    return [...this._map.keys()].filter(name => name.startsWith(start));
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

  private static _instance: CommandRegistry;
}

CommandRegistry.instance().registerBuiltinCommands(AllBuiltinCommands);
