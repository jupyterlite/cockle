import { BuiltinCommand } from './builtin_command';
import { Context } from '../context';
import { ExitCode } from '../exit_code';
import { COCKLE_VERSION } from '../version';

export class CockleConfigCommand extends BuiltinCommand {
  get name(): string {
    return 'cockle-config';
  }

  protected async _run(context: Context): Promise<number> {
    const { stdout } = context;
    stdout.write(`cockle ${COCKLE_VERSION}\n`);
    return ExitCode.SUCCESS;
  }
}
