import { BuiltinCommand } from './builtin_command';
import { IRunContext } from '../context';
import { ExitCode } from '../exit_code';

export class TrueCommand extends BuiltinCommand {
  get name(): string {
    return 'true';
  }

  get description(): string {
    return 'Exit with a status code of 0 (success).';
  }

  help(): string {
    return `Usage: true
  
  Exit with a status code of 0 (success).`;
  }

  protected async _run(_: IRunContext): Promise<number> {
    return ExitCode.SUCCESS;
  }
}

export class FalseCommand extends BuiltinCommand {
  get name(): string {
    return 'false';
  }

  get description(): string {
    return 'Exit with a status code of 1 (failure).';
  }

  help(): string {
    return `Usage: false
  
  Exit with a status code of 1 (failure).`;
  }

  protected async _run(_: IRunContext): Promise<number> {
    return ExitCode.GENERAL_ERROR;
  }
}
