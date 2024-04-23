import { IFileSystem } from "./file_system"

/**
 * Context used to run commands.
 */
export class Context {
  readonly args: string[]
  filesystem: IFileSystem

  constructor(args: string[], filesystem: IFileSystem) {
    this.args = args
    this.filesystem = filesystem
  }



}
