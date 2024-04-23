import { BufferedOutput } from "./buffered_output"
import { IFileSystem } from "../file_system"

export class FileOutput extends BufferedOutput {
  private readonly fs: IFileSystem
  private readonly path: string
  private readonly append: boolean  // or replace

  constructor(fs: IFileSystem, path: string, append: boolean) {
    super()
    this.fs = fs
    this.path = path
    this.append = append
  }

  override async flush(): Promise<void> {
    const all_data = this.data.join()
    console.log("TO FILE:", this.fs, this.path, this.append, all_data)
    this.clear()
  }
}
