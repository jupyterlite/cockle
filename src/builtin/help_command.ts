import { BuiltinCommand } from './builtin_command';
import { IRunContext } from '../context';
import { ExitCode } from '../exit_code';

export class HelpCommand extends BuiltinCommand {
  constructor(private readonly builtins: BuiltinCommand[]) {
    super();
  }

  get name(): string {
    return '--help';
  }

  get description(): string {
    return 'Show general or command-specific help information.';
  }

  protected async _run(context: IRunContext): Promise<number> {
    const args = context.args;

    if (args.length > 0) {
      const cmdName = args[0];
      const command = this.builtins.find(cmd => cmd.name === cmdName);

      if (!command) {
        context.stdout.write(`Unknown command: ${cmdName}\n`);
        return ExitCode.GENERAL_ERROR;
      }

      // Use command's custom help() if available and non-empty
      const helpText = typeof command.help === 'function' ? command.help()?.trim() : '';

      if (helpText) {
        context.stdout.write(`${helpText}\n`);
      } else {
        context.stdout.write(`Usage: ${command.name} [options]\n`);
        context.stdout.write(`${command.description}\n`);
      }

      return ExitCode.SUCCESS;
    }

    context.stdout.write('\nAvailable built-in commands:\n\n');
    for (const builtin of this.builtins) {
      context.stdout.write(`  ${builtin.name.padEnd(15)}${builtin.description}\n`);
    }
    context.stdout.write('\nUse "--help <command>" to get more information.\n');
    return ExitCode.SUCCESS;
  }
}
