import { BuiltinCommand } from './builtin_command';
import { BooleanArgument, PositionalArguments } from '../argument';
import { CommandArguments } from '../arguments';
import type { IRunContext, ITabCompleteContext } from '../context';
import { ExitCode } from '../exit_code';
import type { ITabCompleteResult } from '../tab_complete';

class ExportArguments extends CommandArguments {
  description = `Set export attribute for shell variables.
    
    Marks each NAME for automatic export to the environment of subsequently
    executed commands.  If VALUE is supplied, assign VALUE before exporting.`;
  positional = new PositionalArguments();
  help = new BooleanArgument('h', 'help', 'display this help and exit');
}

export class ExportCommand extends BuiltinCommand {
  get name(): string {
    return 'export';
  }

  async tabComplete(context: ITabCompleteContext): Promise<ITabCompleteResult> {
    return await new ExportArguments().tabComplete(context);
  }

  protected async _run(context: IRunContext): Promise<number> {
    const { environment, stdout } = context;
    const args = new ExportArguments().parse(context.args);

    if (args.help.isSet) {
      args.writeHelp(stdout);
      return ExitCode.SUCCESS;
    }

    if (args.positional.isSet) {
      for (const name of args.positional.strings) {
        const index = name.indexOf('=');
        if (index > 0) {
          const key = name.slice(0, index);
          const value = name.slice(index + 1);
          environment.set(key, value);
        }
      }
    }
    return ExitCode.SUCCESS;
  }
}
