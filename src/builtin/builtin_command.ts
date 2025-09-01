import { CommandType, ICommandRunner } from '../commands';
import { IRunContext } from '../context';
import { FindCommandError } from '../error_exit_code';

export abstract class BuiltinCommand implements ICommandRunner {
  get commandType(): CommandType {
    return CommandType.Builtin;
  }

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

  run(context: IRunContext): Promise<number> {
    const { name } = context;
    if (name !== this.name) {
      // This should not happen.
      throw new FindCommandError(name);
    }
    return this._run(context);
  }

  protected abstract _run(context: IRunContext): Promise<number>;
}
