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
    const { exitCode, newEnvironment } = await this.callExternalCommand(
      this.name,
      args,
      environment,
      stdin.isTerminal(),
      stdout.supportsAnsiEscapes(),
      stderr.supportsAnsiEscapes()
    );

    if (newEnvironment !== undefined) {
      // Maybe should not return all of the environment, but only those keys that have changed.
      // Do this by passing to command a wrapper of Map that stores what keys have changed via
      // set() or delete()
      for (const [key, value] of newEnvironment) {
        environment.set(key, value);
      }
    }

    return exitCode;
  }
}
