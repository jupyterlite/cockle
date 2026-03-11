import { BuiltinCommand } from './builtin_command';
import { BooleanArgument, PositionalArguments } from '../argument';
import { CommandArguments } from '../arguments';
import type { IRunContext, ITabCompleteContext } from '../context';
import { ExitCode } from '../exit_code';
import type { ITabCompleteResult } from '../tab_complete';

class UnsetArguments extends CommandArguments {
  description = `Unset shell variables.

    For each NAME, remove the correpsonding environment variable.
    Ignores NAMEs that are not set.`;
  positional = new PositionalArguments({
    tabComplete: async (context: ITabCompleteContext) => ({
      possibles: context.environment ? context.environment.names() : []
    })
  });
  help = new BooleanArgument('h', 'help', 'display this help and exit');
}

export class UnsetCommand extends BuiltinCommand {
  get name(): string {
    return 'unset';
  }

  async tabComplete(context: ITabCompleteContext): Promise<ITabCompleteResult> {
    return await new UnsetArguments().tabComplete(context);
  }

  protected async _run(context: IRunContext): Promise<number> {
    const { environment, stdout } = context;
    const args = new UnsetArguments().parse(context.args);

    if (args.help.isSet) {
      args.writeHelp(stdout);
      return ExitCode.SUCCESS;
    }

    if (args.positional.isSet) {
      for (const name of args.positional.strings) {
        // It is not an error if name does not exist in environment
        environment.delete(name);
      }
    }
    return ExitCode.SUCCESS;
  }
}
