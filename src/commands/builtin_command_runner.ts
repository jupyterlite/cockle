import { ICommandRunner } from './command_runner';
import { Context } from '../context';
import { FindCommandError, GeneralError } from '../error_exit_code';
import { ExitCode } from '../exit_code';

export class BuiltinCommandRunner implements ICommandRunner {
  names(): string[] {
    return ['alias', 'cd', 'history'];
  }

  async run(cmdName: string, context: Context): Promise<number> {
    switch (cmdName) {
      case 'alias':
        return await this._alias(context);
      case 'cd':
        return await this._cd(context);
      case 'history':
        return await this._history(context);
      default:
        throw new FindCommandError(cmdName);
    }
  }

  private async _alias(context: Context): Promise<number> {
    // TODO: support flags to clear, set, etc.
    const { aliases, stdout } = context;
    for (const [key, value] of aliases.entries()) {
      await stdout.write(`${key}='${value}'\n`);
    }
    return ExitCode.SUCCESS;
  }

  private async _cd(context: Context): Promise<number> {
    const { args } = context;
    if (args.length < 1) {
      // Do nothing. Should cd to home directory?
      return ExitCode.SUCCESS;
    } else if (args.length > 1) {
      throw new GeneralError('cd: too many arguments');
    }

    let path = args[0];
    if (path === '-') {
      const oldPwd = context.environment.get('OLDPWD');
      if (oldPwd === undefined) {
        throw new GeneralError('cd: OLDPWD not set');
      }
      path = oldPwd;
    }

    const { FS } = context.fileSystem;
    const oldPwd = FS.cwd();
    FS.chdir(path);
    context.environment.set('OLDPWD', oldPwd);
    context.environment.set('PWD', FS.cwd());
    return ExitCode.SUCCESS;
  }

  private async _history(context: Context): Promise<number> {
    // TODO: support flags to clear, etc, history.
    const { history, stdout } = context;
    await history.write(stdout);
    return ExitCode.SUCCESS;
  }
}
