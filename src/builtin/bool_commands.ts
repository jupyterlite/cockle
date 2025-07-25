import { BuiltinCommand } from './builtin_command';
import { IRunContext } from '../context';
import { ExitCode } from '../exit_code';

export class TrueCommand extends BuiltinCommand {
  get name(): string {
    return 'true';
  }

  protected async _run(_: IRunContext): Promise<number> {
    return ExitCode.SUCCESS;
  }
}

export class FalseCommand extends BuiltinCommand {
  get name(): string {
    return 'false';
  }

  protected async _run(_: IRunContext): Promise<number> {
    return ExitCode.GENERAL_ERROR;
  }
}
