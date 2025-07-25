import { BuiltinCommand } from './builtin_command';
import { PositionalArguments } from '../argument';
import { CommandArguments } from '../arguments';
import { IRunContext, ITabCompleteContext } from '../context';
import { ExitCode } from '../exit_code';
import { ITabCompleteResult } from '../tab_complete';

class ExportArguments extends CommandArguments {
  positional = new PositionalArguments();
}

export class ExportCommand extends BuiltinCommand {
  get name(): string {
    return 'export';
  }

  async tabComplete(context: ITabCompleteContext): Promise<ITabCompleteResult> {
    return await new ExportArguments().tabComplete(context);
  }

  protected async _run(context: IRunContext): Promise<number> {
    const { environment } = context;
    const args = new ExportArguments().parse(context.args);

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
