import { CommandRegistry } from '../commands/command_registry';
import * as AllBuiltinCommands from './index';

export function registerBuiltins(registry: CommandRegistry): void {
  const builtins = [
    new AllBuiltinCommands.AliasCommand(),
    new AllBuiltinCommands.TrueCommand(),
    new AllBuiltinCommands.FalseCommand(),
    new AllBuiltinCommands.CockleConfigCommand(),
    new AllBuiltinCommands.ExitCommand(),
    new AllBuiltinCommands.ExportCommand(),
    new AllBuiltinCommands.HistoryCommand(),
    new AllBuiltinCommands.WhichCommand(),
    new AllBuiltinCommands.CdCommand(),
    new AllBuiltinCommands.ClearCommand()
  ];

  const helpCommand = new AllBuiltinCommands.HelpCommand(builtins);

  for (const cmd of [...builtins, helpCommand]) {
    registry.registerCommand(cmd);
  }
}
