import { BuiltinCommand } from './builtin_command';
import { BooleanArgument } from '../argument';
import { CommandArguments } from '../arguments';
import { ansi } from '../ansi';
import { IRunContext } from '../context';
import { ExitCode } from '../exit_code';

class ClearArguments extends CommandArguments {
  help = new BooleanArgument('h', 'help', 'display this help and exit');

  constructor() {
    super({
      description: 'Clear the terminal screen if ANSI escapes are supported.'
    });
  }
}

export class ClearCommand extends BuiltinCommand {
  get name(): string {
    return 'clear';
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
