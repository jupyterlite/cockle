import { IFileSystem } from "./file_system"
import * as fs from "node:fs/promises"

export class NodeFileSystem implements IFileSystem {
  // To access local file system.
  // Intended for use in testing, but could be used in production too.

  async list(path: string): Promise<string[]> {
    const filenames = await fs.readdir(path)
    return filenames.sort()
  }
}
