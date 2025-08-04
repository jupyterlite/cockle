import { BuiltinCommand } from './builtin_command';
import { IRunContext, ITabCompleteContext } from '../context';
import { ExitCode } from '../exit_code';
import { ITabCompleteResult } from '../tab_complete';
import { CommandArguments } from '../arguments';
import { BooleanArgument, PositionalArguments } from '../argument';

class WhichArguments extends CommandArguments {
  help = new BooleanArgument('h', 'help', 'display this help and exit');
  positional = new PositionalArguments({ min: 0 });

  constructor() {
    super({
      description:
        'Locate built-in commands by name. Prints each given command if it exists, otherwise an error message.'
    });
  }
}

export class WhichCommand extends BuiltinCommand {
  get name(): string {
    return 'which';
  }

  async tabComplete(context: ITabCompleteContext): Promise<ITabCompleteResult> {
    const possibles = context.commandRegistry?.allCommands();
    return { possibles };
  }

  protected async _run(context: IRunContext): Promise<number> {
    const { args, stdout } = context;

    const allCommands = new Set(context.commandRegistry?.allCommands());

    const parsed = new WhichArguments().parse(context.args);

    if (parsed.help.isSet) {
      parsed.writeHelp(stdout);
      return ExitCode.SUCCESS;
    }

    const positionals = parsed.positional.strings;

    if (positionals.length === 0) {
      stdout.write('which: missing operand\n');
      parsed.writeHelp(stdout);
      return ExitCode.GENERAL_ERROR;
    }

    let exitCode: number = ExitCode.SUCCESS;
    for (const arg of args) {
      if (allCommands.has(arg)) {
        context.stdout.write(`${arg}\n`);
      } else {
        context.stdout.write(`which: no ${arg} command\n`);
        exitCode = ExitCode.GENERAL_ERROR;
      }
    }

    return exitCode;
  }
}
