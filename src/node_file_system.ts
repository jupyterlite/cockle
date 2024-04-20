import { IFileSystem } from "./file_system"
import * as fs from "node:fs/promises"
import { join } from "node:path"

export class NodeFileSystem implements IFileSystem {
  // To access local file system.
  // Intended for use in testing, but could be used in production too.
  // Paths are with respect to a baseDir for similarity with JupyterFileSystem.
  // Path joining on Windows?

  constructor(baseDir: string) {
    // Check needed that this is a valid directory.
    this._baseDir = baseDir
  }

  async delete(path: string): Promise<void> {
    await fs.unlink(join(this._baseDir, path))
  }

  async list(path: string): Promise<string[]> {
    const filenames = await fs.readdir(join(this._baseDir, path))
    return filenames.sort()
  }

  async touch(path: string): Promise<void> {
    // Assume new file
    await fs.writeFile(join(this._baseDir, path), "")
  }

  private _baseDir: string
}
