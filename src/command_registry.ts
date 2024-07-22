import { ICommandRunner } from './commands/command_runner';
import { BuiltinCommandRunner } from './commands/builtin_command_runner';
import { CoreutilsCommandRunner } from './commands/coreutils_command_runner';
import { GrepCommandRunner } from './commands/grep_command_runner';

export class CommandRegistry {
  private constructor() {
    this._commandRunners = [
      new BuiltinCommandRunner(),
      new CoreutilsCommandRunner(),
      new GrepCommandRunner()
    ];

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

  private _commandRunners: ICommandRunner[];
  private _map: Map<string, ICommandRunner> = new Map();

  private static _instance: CommandRegistry;
}
