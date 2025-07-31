import { BuiltinCommand } from './builtin_command';
import { PositionalPathArguments } from '../argument';
import { CommandArguments } from '../arguments';
import { IRunContext, ITabCompleteContext } from '../context';
import { GeneralError } from '../error_exit_code';
import { ExitCode } from '../exit_code';
import { ITabCompleteResult, PathType } from '../tab_complete';

class CdArguments extends CommandArguments {
  positional = new PositionalPathArguments({ pathType: PathType.Directory });
}

export class CdCommand extends BuiltinCommand {
  get name(): string {
    return 'cd';
  }

  get description(): string {
    return 'Change the current working directory.';
  }

  help(): string {
    return `Options:
    [path]   The target directory to change into.
             If omitted, defaults to the home directory.`;
  }

  async tabComplete(context: ITabCompleteContext): Promise<ITabCompleteResult> {
    return await new CdArguments().tabComplete(context);
  }

  protected async _run(context: IRunContext): Promise<number> {
    const args = new CdArguments().parse(context.args);
    const paths = args.positional.strings;

    if (paths.length < 1) {
      // Do nothing. Should cd to home directory?
      return ExitCode.SUCCESS;
    } else if (paths.length > 1) {
      throw new GeneralError('cd: too many arguments');
    }

    let path = paths[0];
    if (path === '-') {
      const oldPwd = context.environment.get('OLDPWD');
      if (oldPwd === undefined) {
        throw new GeneralError('cd: OLDPWD not set');
      }
      path = oldPwd;
      context.stdout.write(`${path}\n`);
    }

    const { FS } = context.fileSystem;
    const oldPwd = FS.cwd();
    FS.chdir(path);
    context.environment.set('OLDPWD', oldPwd);
    context.environment.set('PWD', FS.cwd());
    return ExitCode.SUCCESS;
  }
}
