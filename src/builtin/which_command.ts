import { BuiltinCommand } from './builtin_command';
import { IRunContext, ITabCompleteContext } from '../context';
import { ExitCode } from '../exit_code';
import { ITabCompleteResult } from '../tab_complete';

export class WhichCommand extends BuiltinCommand {
  get name(): string {
    return 'which';
  }

  get description(): string {
    return 'Show the location of executables or built-in commands.';
  }

  help(): string {
    return `Usage: which <command>
  
  Show the location of executables or built-in commands.
  
  Examples:
    which ls
    which cd`;
  }

  async tabComplete(context: ITabCompleteContext): Promise<ITabCompleteResult> {
    const possibles = context.commandRegistry?.allCommands();
    return { possibles };
  }

  protected async _run(context: IRunContext): Promise<number> {
    const { args } = context;

    const allCommands = new Set(context.commandRegistry?.allCommands());

    let exitCode: number = ExitCode.SUCCESS;
    for (const arg of args) {
      if (allCommands.has(arg)) {
        context.stdout.write(`${arg}\n`);
      } else {
        context.stdout.write(`which: no ${arg} command\n`);
        exitCode = ExitCode.GENERAL_ERROR;
      }
    }

    return exitCode;
  }
}
