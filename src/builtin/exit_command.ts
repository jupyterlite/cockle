import { BuiltinCommand } from './builtin_command';
import { IRunContext } from '../context';
import { ExitCode } from '../exit_code';

export class ExitCommand extends BuiltinCommand {
  get name(): string {
    return 'exit';
  }

  get description(): string {
    return 'Exit the shell.';
  }

  help(): string {
    return `Usage: exit [status]
  
  Exit the shell with an optional status code. Defaults to 0.
  
  Examples:
    exit
    exit 1`;
  }

  protected async _run(context: IRunContext): Promise<number> {
    const { stdout, terminate } = context;

    stdout.write('Terminating shell...\n');
    stdout.flush();

    terminate();

    return ExitCode.SUCCESS;
  }
}
