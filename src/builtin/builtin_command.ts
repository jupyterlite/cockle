import { ICommandRunner } from '../commands/command_runner';
import { IContext } from '../context';
import { FindCommandError } from '../error_exit_code';

export abstract class BuiltinCommand implements ICommandRunner {
  get moduleName(): string {
    return '<builtin>';
  }

  get packageName(): string {
    return '';
  }

  names(): string[] {
    return [this.name];
  }

  abstract get name(): string;

  run(cmdName: string, context: IContext): Promise<number> {
    if (cmdName !== this.name) {
      // This should not happen.
      throw new FindCommandError(cmdName);
    }
    return this._run(context);
  }

  protected abstract _run(context: IContext): Promise<number>;
}
