import { BuiltinCommand } from './builtin_command';
import { TrailingStringsOption } from './option';
import { Options } from './options';
import { Context } from '../context';
import { ExitCode } from '../exit_code';

class AliasOptions extends Options {
  trailingStrings = new TrailingStringsOption(0);
}

export class AliasCommand extends BuiltinCommand {
  get name(): string {
    return 'alias';
  }

  protected async _run(context: Context): Promise<number> {
    const { aliases, args, stdout } = context;
    const options = Options.fromArgs(args, AliasOptions);

    if (options.trailingStrings.isSet) {
      for (const name of options.trailingStrings.strings) {
        const index = name.indexOf('=');
        if (index === -1) {
          // Print alias.
          stdout.write(`${name}='${aliases.get(name)}'\n`);
        } else {
          // Set alias.
          aliases.set(name.slice(0, index), name.slice(index + 1));
        }
      }
    } else {
      // Write all aliases.
      for (const [key, value] of aliases.entries()) {
        stdout.write(`${key}='${value}'\n`);
      }
    }
    return ExitCode.SUCCESS;
  }
}
