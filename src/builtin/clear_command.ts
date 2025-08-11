import { BuiltinCommand } from './builtin_command';
import { BooleanArgument } from '../argument';
import { CommandArguments } from '../arguments';
import { ansi } from '../ansi';
import { IRunContext, ITabCompleteContext } from '../context';
import { ExitCode } from '../exit_code';
import { ITabCompleteResult } from '../tab_complete';

class ClearArguments extends CommandArguments {
  description = 'Clear the terminal screen if ANSI escapes are supported.';
  help = new BooleanArgument('h', 'help', 'display this help and exit');
}

export class ClearCommand extends BuiltinCommand {
  get name(): string {
    return 'clear';
  }

  async tabComplete(context: ITabCompleteContext): Promise<ITabCompleteResult> {
    return await new ClearArguments().tabComplete(context);
  }

  protected async _run(context: IRunContext): Promise<number> {
    const { stdout } = context;
    const args = new ClearArguments().parse(context.args);

    if (args.help.isSet) {
      args.writeHelp(stdout);
      return ExitCode.SUCCESS;
    }

    if (stdout.supportsAnsiEscapes()) {
      stdout.write(ansi.eraseScreen + ansi.eraseSavedLines + ansi.cursorHome);
    }
    return ExitCode.SUCCESS;
  }
}
