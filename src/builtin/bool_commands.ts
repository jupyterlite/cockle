import { BuiltinCommand } from './builtin_command';
import { CommandArguments } from '../arguments';
import { BooleanArgument } from '../argument';
import { IRunContext } from '../context';
import { ExitCode } from '../exit_code';

class BoolStubArguments extends CommandArguments {
  help = new BooleanArgument('h', 'help', 'display this help and exit');
}

class TrueArguments extends BoolStubArguments {
  description = 'Always succeeds; Return a successful result.';
}

class FalseArguments extends BoolStubArguments {
  description = 'Always fails; Return an unsuccessful result.';
}

export class TrueCommand extends BuiltinCommand {
  get name(): string {
    return 'true';
  }

  protected async _run(context: IRunContext): Promise<number> {
    const args = new TrueArguments().parse(context.args);
    if (args.help.isSet) {
      args.writeHelp(context.stdout);
      return ExitCode.SUCCESS;
    }
    return ExitCode.SUCCESS;
  }
}

export class FalseCommand extends BuiltinCommand {
  get name(): string {
    return 'false';
  }

  protected async _run(context: IRunContext): Promise<number> {
    const args = new FalseArguments().parse(context.args);
    if (args.help.isSet) {
      args.writeHelp(context.stdout);
      return ExitCode.SUCCESS;
    }
    return ExitCode.GENERAL_ERROR;
  }
}
