import { BuiltinCommand } from './builtin_command';
import { TrailingStringsOption } from './option';
import { Options } from './options';
import { Context } from '../context';
import { ExitCode } from '../exit_code';

class ExportOptions extends Options {
  trailingStrings = new TrailingStringsOption(0);
}

export class ExportCommand extends BuiltinCommand {
  get name(): string {
    return 'export';
  }

  protected async _run(context: Context): Promise<number> {
    const { args, environment } = context;
    const options = Options.fromArgs(args, ExportOptions);

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
