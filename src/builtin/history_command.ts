import { BuiltinCommand } from './builtin_command';
import { BooleanOption } from './option';
import { Options } from './options';
import { IContext } from '../context';
import { ExitCode } from '../exit_code';

class HistoryOptions extends Options {
  clear = new BooleanOption('c', '', 'clear the history by deleting all of the entries');
  help = new BooleanOption('', 'help', 'display this help and exit');
}

export class HistoryCommand extends BuiltinCommand {
  get name(): string {
    return 'history';
  }

  protected async _run(context: IContext): Promise<number> {
    const { args, history, stdout } = context;
    const options = new HistoryOptions().parse(args);

    if (options.help.isSet) {
      options.writeHelp(stdout);
    } else if (options.clear.isSet) {
      history.clear();
    } else {
      history.write(stdout);
    }
    return ExitCode.SUCCESS;
  }
}
