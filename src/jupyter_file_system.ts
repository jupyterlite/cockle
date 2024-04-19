import { Contents } from '@jupyterlab/services';
import { IFileSystem } from "./file_system"

export class JupyterFileSystem implements IFileSystem {
  constructor(contentsManager: Contents.IManager) {
    this._contentsManager = contentsManager
  }

  async list(path: string): Promise<string[]> {
    const listing = await this._contentsManager.get(path)
    const content = listing.content as Contents.IModel[]
    const filenames = content.map((model) => model.name)
    return filenames.sort()
  }

  private _contentsManager: Contents.IManager
}
