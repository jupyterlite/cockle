import { ICommandRunner } from '../commands/command_runner';
import { Context } from '../context';
import { FindCommandError } from '../error_exit_code';

export abstract class BuiltinCommand implements ICommandRunner {
  names(): string[] {
    return [this.name];
  }

  abstract get name(): string;

  run(cmdName: string, context: Context): Promise<number> {
    if (cmdName !== this.name) {
      // This should not happen.
      throw new FindCommandError(cmdName);
    }
    return this._run(context);
  }

  protected abstract _run(context: Context): Promise<number>;
}
