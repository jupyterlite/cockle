import { BuiltinCommand } from './builtin_command';
import { TrailingStringsOption } from './option';
import { Options } from './options';
import { IContext } from '../context';
import { GeneralError } from '../error_exit_code';
import { ExitCode } from '../exit_code';

class CdOptions extends Options {
  trailingStrings = new TrailingStringsOption(0);
}

export class CdCommand extends BuiltinCommand {
  get name(): string {
    return 'cd';
  }

  protected async _run(context: IContext): Promise<number> {
    const { args } = context;
    const options = new CdOptions().parse(args);
    const paths = options.trailingStrings.strings;

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
