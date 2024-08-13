import { BuiltinCommand } from './builtin_command';
import { ansi } from '../ansi';
import { Context } from '../context';
import { ExitCode } from '../exit_code';

export class ClearCommand extends BuiltinCommand {
  get name(): string {
    return 'clear';
  }

  protected async _run(context: Context): Promise<number> {
    const { stdout } = context;
    if (stdout.supportsAnsiEscapes()) {
      stdout.write(ansi.eraseScreen + ansi.eraseSavedLines + ansi.cursorHome);
    }
    return ExitCode.SUCCESS;
  }
}
