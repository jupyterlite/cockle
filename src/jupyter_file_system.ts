import type { Contents } from '@jupyterlab/services';
import { IFileSystem } from "./file_system"

export class JupyterFileSystem implements IFileSystem {
  constructor(contentsManager: Contents.IManager) {
    this._contentsManager = contentsManager
  }

  async delete(path: string): Promise<void> {
    await this._contentsManager.delete(path)
  }

  async get(path: string): Promise<string> {
    const listing = await this._contentsManager.get(path, { content: true })
    // Should check only a single item returned.
    const content = listing.content as string
    return content
  }

  async list(path: string): Promise<string[]> {
    try {
      const listing = await this._contentsManager.get(path, { content: true })
      if (listing.type == "file") {
        return [listing.name]
      } else {  // listing.type == "directory"
        const content = listing.content as Contents.IModel[]
        const filenames = content.map((model) => model.name)
        return filenames.sort()
      }
    } catch (error: any) {
      // Need to handle possible error cases here.
      return []
    }
  }

  async touch(path: string): Promise<void> {
    // Assume new file
    const model = await this._contentsManager.newUntitled()
    await this._contentsManager.rename(model.path, path)
  }

  async write(path: string, content: string): Promise<void> {
    await this._contentsManager.save(path, { content })
  }

  private _contentsManager: Contents.IManager
}
