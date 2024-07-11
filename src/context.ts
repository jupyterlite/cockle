import { Environment } from "./environment"
import { IFileSystem } from "./file_system"
import { Input, Output } from "./io"

/**
 * Context used to run commands.
 */
export class Context {
  constructor(
    readonly args: string[],
    readonly fileSystem: IFileSystem,
    readonly mountpoint: string,
    environment: Environment,
    readonly stdin: Input,
    readonly stdout: Output,
  ) {
    this.environment = environment
  }

  async flush(): Promise<void> {
    await this.stdout.flush()
  }

  environment: Environment
}
