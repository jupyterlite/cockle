import { IFileSystem } from "./file_system"
import { Output } from "./io"

/**
 * Context used to run commands.
 */
export class Context {
  constructor(
    args: string[],
    filesystem: IFileSystem,
    stdout: Output,
    env: Map<string, string> | null = null,
  ) {
    this.args = args
    this.filesystem = filesystem
    this.stdout = stdout
    this.env = env ?? new Map()
  }

  async flush(): Promise<void> {
    await this.stdout.flush()
  }

  readonly args: string[]
  readonly filesystem: IFileSystem
  readonly stdout: Output
  env: Map<string, string>
}
