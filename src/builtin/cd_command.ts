import { BuiltinCommand } from './builtin_command';
import { PositionalPathArguments } from '../argument';
import { CommandArguments } from '../arguments';
import { IRunContext, ITabCompleteContext } from '../context';
import { GeneralError } from '../error_exit_code';
import { ExitCode } from '../exit_code';
import { ITabCompleteResult, PathType } from '../tab_complete';
import { BooleanArgument } from '../argument';

class CdArguments extends CommandArguments {
  positional = new PositionalPathArguments({ pathType: PathType.Directory });
  help = new BooleanArgument('h', 'help', 'display this help and exit');

  constructor() {
    super({
      description: `Change the shell working directory.
    
    Change the current directory to DIR.  The default DIR is the value of the
    HOME shell variable. If DIR is "-", it is converted to $OLDPWD.
    
    The variable CDPATH defines the search path for the directory containing
    DIR.  Alternative directory names in CDPATH are separated by a colon (:).
    A null directory name is the same as the current directory.  If DIR begins
    with a slash (/), then CDPATH is not used.
    
    If the directory is not found, and the shell option cdable_vars is set,
    the word is assumed to be  a variable name.  If that variable has a value,
    its value is used for DIR.`
    });
  }
}

export class CdCommand extends BuiltinCommand {
  get name(): string {
    return 'cd';
  }

  async tabComplete(context: ITabCompleteContext): Promise<ITabCompleteResult> {
    return await new CdArguments().tabComplete(context);
  }

  protected async _run(context: IRunContext): Promise<number> {
    const args = new CdArguments().parse(context.args);

    if (args.help.isSet) {
      args.writeHelp(context.stdout);
      return ExitCode.SUCCESS;
    }

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
