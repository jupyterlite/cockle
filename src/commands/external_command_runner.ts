import { ICallExternalCommand } from '../callback_internal';
import { ICommandRunner } from './command_runner';
import { IContext } from '../context';
import { FindCommandError } from '../error_exit_code';

export class ExternalCommandRunner implements ICommandRunner {
  constructor(
    readonly name: string,
    readonly callExternalCommand: ICallExternalCommand
  ) {}

  get moduleName() {
    return '<external>';
  }

  names(): string[] {
    return [this.name];
  }

  get packageName(): string {
    return '';
  }

  async run(cmdName: string, context: IContext): Promise<number> {
    if (cmdName !== this.name) {
      // This should not happen.
      throw new FindCommandError(cmdName);
    }

    const { args, environment, stdin, stdout, stderr } = context;
    const { exitCode, environmentChanges } = await this.callExternalCommand(
      this.name,
      args,
      Object.fromEntries(environment),
      stdin.isTerminal(),
      stdout.supportsAnsiEscapes(),
      stderr.supportsAnsiEscapes()
    );

    if (environmentChanges !== undefined) {
      Object.entries(environmentChanges).forEach(([name, value]) => {
        if (value === undefined) {
          environment.delete(name);
        } else {
          environment.set(name, value);
        }
      });
    }
    return exitCode;
  }
}
