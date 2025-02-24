import { CommandModule } from './command_module';
import { ICommandRunner } from './command_runner';
import { IContext } from '../context';

/**
 * Abstract base class for command runner that dynamically loads the command at runtime.
 */
export abstract class DynamicallyLoadedCommandRunner implements ICommandRunner {
  constructor(readonly module: CommandModule) {}

  get moduleName(): string {
    return this.module.moduleName;
  }

  names(): string[] {
    return this.module.names;
  }

  get packageName(): string {
    return this.module.packageName;
  }

  abstract run(cmdName: string, context: IContext): Promise<number>;
}
