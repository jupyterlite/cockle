import type { CommandModule } from './command_module';
import type { ICommandRunner } from './command_runner';
import type { CommandType } from './command_type';
import type { IRunContext } from '../context';

/**
 * Abstract base class for command runner that dynamically loads the command at runtime.
 */
export abstract class DynamicallyLoadedCommandRunner implements ICommandRunner {
  constructor(readonly module: CommandModule) {}

  abstract get commandType(): CommandType;

  get moduleName(): string {
    return this.module.moduleName;
  }

  names(): string[] {
    return this.module.names;
  }

  get packageName(): string {
    return this.module.packageName;
  }

  abstract run(context: IRunContext): Promise<number>;
}
