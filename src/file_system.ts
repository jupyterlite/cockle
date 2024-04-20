export interface IFileSystem {
  // Interface for communication with file system.

  delete(path: string): Promise<void>

  list(path: string): Promise<string[]>

  // Assume new file ...
  touch(path: string): Promise<void>
}
