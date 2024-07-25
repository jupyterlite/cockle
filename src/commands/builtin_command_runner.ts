import { ICommandRunner } from './command_runner';
import { Context } from '../context';

export class BuiltinCommandRunner implements ICommandRunner {
  names(): string[] {
    return ['alias', 'cd', 'history'];
  }

  async run(cmdName: string, context: Context): Promise<void> {
    switch (cmdName) {
      case 'alias':
        await this._alias(context);
        break;
      case 'cd':
        await this._cd(context);
        break;
      case 'history':
        await this._history(context);
        break;
    }
  }

  private async _alias(context: Context) {
    // TODO: support flags to clear, set, etc.
    const { aliases, stdout } = context;
    for (const [key, value] of aliases.entries()) {
      await stdout.write(`${key}='${value}'\n`);
    }
  }

  private async _cd(context: Context) {
    const { args, stderr } = context;
    if (args.length < 1) {
      // Do nothing.
      return;
    } else if (args.length > 1) {
      await stderr.write('cd: too many arguments\r\n');
      return;
    }

    let path = args[0];
    if (path === '-') {
      const oldPwd = context.environment.get('OLDPWD');
      if (oldPwd === undefined) {
        await stderr.write('cd: OLDPWD not set\r\n');
        return;
      }
      path = oldPwd;
    }

    const { FS } = context.fileSystem;
    const oldPwd = FS.cwd();
    FS.chdir(path);
    context.environment.set('OLDPWD', oldPwd);
    context.environment.set('PWD', FS.cwd());
  }

  private async _history(context: Context) {
    // TODO: support flags to clear, etc, history.
    const { history, stdout } = context;
    await history.write(stdout);
  }
}
