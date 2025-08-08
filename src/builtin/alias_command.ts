import { BuiltinCommand } from './builtin_command';
import { BooleanArgument, PositionalArguments } from '../argument';
import { CommandArguments } from '../arguments';
import { IRunContext, ITabCompleteContext } from '../context';
import { ExitCode } from '../exit_code';
import { ITabCompleteResult } from '../tab_complete';

class AliasArguments extends CommandArguments {
  description = `Without arguments, 'alias' prints the list of aliases in the reusable
    form 'alias NAME=VALUE' on standard output.

    Otherwise, an alias is defined for each NAME whose VALUE is given.
    A trailing space in VALUE causes the next word to be checked for
    alias substitution when the alias is expanded.
    `;

  positional = new PositionalArguments();
  help = new BooleanArgument('h', 'help', 'display this help and exit');
}

export class AliasCommand extends BuiltinCommand {
  get name(): string {
    return 'alias';
  }

  async tabComplete(context: ITabCompleteContext): Promise<ITabCompleteResult> {
    return await new AliasArguments().tabComplete(context);
  }

  protected async _run(context: IRunContext): Promise<number> {
    const { aliases, stdout } = context;
    const args = new AliasArguments().parse(context.args);

    if (args.help.isSet) {
      args.writeHelp(stdout);
      return ExitCode.SUCCESS;
    }

    if (args.positional.isSet) {
      for (const name of args.positional.strings) {
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
