import { Contents } from '@jupyterlab/services';
import { IFileSystem } from "./file_system"

export class JupyterFileSystem implements IFileSystem {
  constructor(contentsManager: Contents.IManager) {
    this._contentsManager = contentsManager
  }

  async delete(path: string): Promise<void> {
    await this._contentsManager.delete(path)
  }

  async get(path: string): Promise<string> {
    const listing = await this._contentsManager.get(path)
    // Should check only a single item returned.
    const content = listing.content as string
    return content
  }

  async list(path: string): Promise<string[]> {
    const listing = await this._contentsManager.get(path)
    const content = listing.content as Contents.IModel[]
    const filenames = content.map((model) => model.name)
    return filenames.sort()
  }

  async touch(path: string): Promise<void> {
    // Assume new file
    const model = await this._contentsManager.newUntitled()
    await this._contentsManager.rename(model.path, path)
  }

  private _contentsManager: Contents.IManager
}
