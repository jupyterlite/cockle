import { BuiltinCommand } from './builtin_command';
import { IRunContext } from '../context';
import { ExitCode } from '../exit_code';
import { TrailingStringsOption } from '../option';
import { Options } from '../options';
import { ITabCompleteContext, ITabCompleteResult } from '../tab_complete';

class ExportOptions extends Options {
  trailingStrings = new TrailingStringsOption();
}

export class ExportCommand extends BuiltinCommand {
  get name(): string {
    return 'export';
  }

  async tabComplete(context: ITabCompleteContext): Promise<ITabCompleteResult> {
    return await new ExportOptions().tabComplete(context);
  }

  protected async _run(context: IRunContext): Promise<number> {
    const { args, environment } = context;
    const options = new ExportOptions().parse(args);

    if (options.trailingStrings.isSet) {
      for (const name of options.trailingStrings.strings) {
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
