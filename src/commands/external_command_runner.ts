import { ICommandRunner } from './command_runner';
import { CommandType } from './command_type';
import { ICallExternalCommand, ICallExternalTabComplete } from '../callback_internal';
import { IRunContext, ITabCompleteContext } from '../context';
import { FindCommandError } from '../error_exit_code';
import { ITabCompleteResult } from '../tab_complete';

export class ExternalCommandRunner implements ICommandRunner {
  constructor(
    readonly name: string,
    readonly callExternalCommand: ICallExternalCommand,
    readonly callExternalTabComplete: ICallExternalTabComplete | undefined
  ) {}

  get commandType(): CommandType {
    return CommandType.External;
  }

  get moduleName() {
    return '<external>';
  }

  names(): string[] {
    return [this.name];
  }

  get packageName(): string {
    return '';
  }

  async run(context: IRunContext): Promise<number> {
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
      stdout.isTerminal(),
      stderr.isTerminal(),
      context.termios.get()
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

  async tabComplete(context: ITabCompleteContext): Promise<ITabCompleteResult> {
    if (this.callExternalTabComplete !== undefined) {
      const { name, args } = context;
      return await this.callExternalTabComplete(name, args);
    }

    return {};
  }
}
