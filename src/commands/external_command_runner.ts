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

  async run(context: IContext): Promise<number> {
    const { name, args, environment, stdin, stdout, stderr } = context;

    if (name !== this.name) {
      // This should not happen.
      throw new FindCommandError(name);
    }

    const { exitCode, environmentChanges } = await this.callExternalCommand(
      name,
      args,
      Object.fromEntries(environment),
      stdin.isTerminal(),
      stdout.supportsAnsiEscapes(),
      stderr.supportsAnsiEscapes()
    );

    if (environmentChanges !== undefined) {
      Object.entries(environmentChanges).forEach(([envName, envValue]) => {
        if (envValue === undefined) {
          environment.delete(envName);
        } else {
          environment.set(envName, envValue);
        }
      });
    }
    return exitCode;
  }
}
