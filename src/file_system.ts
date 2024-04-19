export interface IFileSystem {
  // Interface for communication with file system.
  list(path: string): Promise<string[]>
}
