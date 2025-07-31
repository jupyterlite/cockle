import { BuiltinCommand } from './builtin_command';
import { ansi } from '../ansi';
import { IRunContext } from '../context';
import { ExitCode } from '../exit_code';

export class ClearCommand extends BuiltinCommand {
  get name(): string {
    return 'clear';
  }

  get description(): string {
    return 'Clear the terminal screen.';
  }

  help(): string {
    return `Usage: clear
  
  Clear the terminal screen.`;
  }

  protected async _run(context: IRunContext): Promise<number> {
    const { stdout } = context;
    if (stdout.supportsAnsiEscapes()) {
      stdout.write(ansi.eraseScreen + ansi.eraseSavedLines + ansi.cursorHome);
    }
    return ExitCode.SUCCESS;
  }
}
