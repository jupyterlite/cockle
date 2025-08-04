import { BuiltinCommand } from './builtin_command';
import { IRunContext } from '../context';
import { ExitCode } from '../exit_code';
import { BooleanArgument } from '../argument';
import { CommandArguments } from '../arguments';

class ExitArguments extends CommandArguments {
  help = new BooleanArgument('h', 'help', 'display this help and exit');

  constructor() {
    super({
      description: `Exit the shell.
    
    Exits the shell with a status of N.  If N is omitted, the exit status
    is that of the last command executed.`
    });
  }
}

export class ExitCommand extends BuiltinCommand {
  get name(): string {
    return 'exit';
  }

  protected async _run(context: IRunContext): Promise<number> {
    const { stdout, terminate } = context;
    const args = new ExitArguments().parse(context.args);

    if (args.help.isSet) {
      args.writeHelp(stdout);
      return ExitCode.SUCCESS;
    }

    stdout.write('Terminating shell...\n');
    stdout.flush();

    terminate();

    return ExitCode.SUCCESS;
  }
}
