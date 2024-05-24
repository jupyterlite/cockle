export interface IFileSystem {
  // Interface for communication with file system.

  delete(path: string): Promise<void>

  // Get file contents
  get(path: string): Promise<string>

  list(path: string): Promise<string[]>

  // Assume new file ...
  touch(path: string): Promise<void>

  write(path: string, content: string): Promise<void>
}
