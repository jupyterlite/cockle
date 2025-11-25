import { BuiltinCommand } from './builtin_command';
import { BooleanArgument, PositionalArguments } from '../argument';
import { CommandArguments } from '../arguments';
import type { IRunContext, ITabCompleteContext } from '../context';
import { ExitCode } from '../exit_code';
import type { ITabCompleteResult } from '../tab_complete';

class WhichArguments extends CommandArguments {
  description =
    'Locate built-in commands by name. Prints each given command if it exists, otherwise an error message.';
  help = new BooleanArgument('h', 'help', 'display this help and exit');
  positional = new PositionalArguments({
    tabComplete: async (context: ITabCompleteContext) => ({
      possibles: context.commandRegistry?.commandNames() ?? []
    })
  });
}

export class WhichCommand extends BuiltinCommand {
  get name(): string {
    return 'which';
  }

  async tabComplete(context: ITabCompleteContext): Promise<ITabCompleteResult> {
    return await new WhichArguments().tabComplete(context);
  }

  protected async _run(context: IRunContext): Promise<number> {
    const { args, stdout } = context;

    const allCommands = new Set(context.commandRegistry?.commandNames());

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
