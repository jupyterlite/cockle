import { BufferedOutput } from "./buffered_output"
import { IFileSystem } from "../file_system"

export class FileOutput extends BufferedOutput {
  constructor(fs: IFileSystem, path: string, append: boolean) {
    super()
    this.fs = fs
    this.path = path
    this.append = append

    if (this.append) {
      throw Error("FileOutput in append mode not implemented")
    }
  }

  override async flush(): Promise<void> {
    const all_data = this.data.join()
    this.fs.write(this.path, all_data);
    this.clear()
  }

  private readonly fs: IFileSystem
  private readonly path: string
  private readonly append: boolean  // or replace
}
