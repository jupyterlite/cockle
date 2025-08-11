import { BuiltinCommand } from './builtin_command';
import { BooleanArgument } from '../argument';
import { CommandArguments } from '../arguments';
import { IRunContext, ITabCompleteContext } from '../context';
import { ExitCode } from '../exit_code';
import { ITabCompleteResult } from '../tab_complete';

class HistoryArguments extends CommandArguments {
  description = ` Display or manipulate the history list.

    Display the history list with line numbers, prefixing each modified
    entry with a '*'`;
  clear = new BooleanArgument('c', '', 'clear the history by deleting all of the entries');
  help = new BooleanArgument('h', 'help', 'display this help and exit');
}

export class HistoryCommand extends BuiltinCommand {
  get name(): string {
    return 'history';
  }

  async tabComplete(context: ITabCompleteContext): Promise<ITabCompleteResult> {
    return await new HistoryArguments().tabComplete(context);
  }

  protected async _run(context: IRunContext): Promise<number> {
    const { history, stdout } = context;
    const args = new HistoryArguments().parse(context.args);

    if (args.help.isSet) {
      args.writeHelp(stdout);
    } else if (args.clear.isSet) {
      history.clear();
    } else {
      history.write(stdout);
    }
    return ExitCode.SUCCESS;
  }
}
