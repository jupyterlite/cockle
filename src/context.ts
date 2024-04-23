import { IFileSystem } from "./file_system"
import { Output } from "./io"

/**
 * Context used to run commands.
 */
export class Context {
  readonly args: string[]
  readonly filesystem: IFileSystem
  readonly stdout: Output

  constructor(args: string[], filesystem: IFileSystem, stdout: Output) {
    this.args = args
    this.filesystem = filesystem
    this.stdout = stdout
  }

  async flush(): Promise<void> {
    await this.stdout.flush()
  }
}
