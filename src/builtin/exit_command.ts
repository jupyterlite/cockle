import { BuiltinCommand } from './builtin_command';
import { Context } from '../context';
import { ExitCode } from '../exit_code';

export class ExitCommand extends BuiltinCommand {
  get name(): string {
    return 'exit';
  }

  protected async _run(context: Context): Promise<number> {
    const { stdout, terminate } = context;

    stdout.write('Terminating shell...\n');
    stdout.flush();

    terminate();

    return ExitCode.SUCCESS;
  }
}
