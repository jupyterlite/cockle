import { Aliases } from './aliases';
import { CommandRegistry } from './command_registry';
import { Environment } from './environment';
import { History } from './history';
import { IFileSystem } from './file_system';
import { IInput, IOutput } from './io';

/**
 * Context used to run commands.
 */
export class Context {
  constructor(
    readonly args: string[],
    readonly fileSystem: IFileSystem,
    readonly mountpoint: string,
    readonly aliases: Aliases,
    readonly commandRegistry: CommandRegistry,
    readonly environment: Environment,
    readonly history: History,
    readonly stdin: IInput,
    readonly stdout: IOutput,
    readonly stderr: IOutput
  ) {}

  async flush(): Promise<void> {
    await this.stderr.flush();
    await this.stdout.flush();
  }
}
