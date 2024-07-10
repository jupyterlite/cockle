import { Input } from "./input"
import { IFileSystem } from "../file_system"

export class FileInput extends Input {
  constructor(readonly fileSystem: IFileSystem, readonly path: string) {
    super()
  }

  read(): string {
    const { FS } = this.fileSystem
    const contents = FS.readFile(this.path, { "encoding": "utf8" })
    return contents
  }
}
