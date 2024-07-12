import { IFileSystem } from "../file_system"
import { IInput } from "./input"

export class FileInput implements IInput {
  constructor(readonly fileSystem: IFileSystem, readonly path: string) {}

  read(): string {
    const { FS } = this.fileSystem
    const contents = FS.readFile(this.path, { "encoding": "utf8" })
    return contents
  }
}
