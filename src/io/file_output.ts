import { BufferedOutput } from "./buffered_output"
import { IFileSystem } from "../file_system"

export class FileOutput extends BufferedOutput {
  constructor(readonly fileSystem: IFileSystem, readonly path: string, readonly append: boolean) {
    super()
  }

  override async flush(): Promise<void> {
    const { FS } = this.fileSystem
    let content = this.data.join("")

    if (this.append) {
      try {
        const prevContent = FS.readFile(this.path, { "encoding": "utf8" })
        content = prevContent + content
      } catch (e) {
        // If file does not exist, fallback to write (non-append) behaviour.
      }
    }

    FS.writeFile(this.path, content)
    this.clear()
  }
}
