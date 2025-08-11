import { BuiltinCommand } from './builtin_command';
import { BooleanArgument } from '../argument';
import { CommandArguments } from '../arguments';
import { IRunContext, ITabCompleteContext } from '../context';
import { ExitCode } from '../exit_code';
import { ITabCompleteResult } from '../tab_complete';

class ExitArguments extends CommandArguments {
  description = 'Exit the shell';
  help = new BooleanArgument('h', 'help', 'display this help and exit');
}

export class ExitCommand extends BuiltinCommand {
  get name(): string {
    return 'exit';
  }

  async tabComplete(context: ITabCompleteContext): Promise<ITabCompleteResult> {
    return await new ExitArguments().tabComplete(context);
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
