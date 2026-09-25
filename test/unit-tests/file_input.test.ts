import type { IFileSystem } from '../../src/file_system';
import { FileInput } from '../../src/io/file_input';

/** File system stub with just the members FileInput uses. */
function getFileSystem(files: { [path: string]: string }): IFileSystem {
  const FS = {
    analyzePath: (path: string) => ({ exists: Object.hasOwn(files, path) }),
    readFile: (path: string) => {
      if (!Object.hasOwn(files, path)) {
        throw new Error(`ENOENT: ${path}`);
      }
      return files[path];
    },
    writeFile: (path: string, content: string) => {
      files[path] = content;
    }
  };
  return { FS } as unknown as IFileSystem;
}

describe('FileInput', () => {
  test('should read all content', () => {
    const input = new FileInput(getFileSystem({ 'file.txt': 'hello\n' }), 'file.txt');
    expect(input.isTerminal()).toBe(false);
    expect(input.readAll()).toBe('hello\n');
  });

  test('should create a missing file when create is set', () => {
    const files: { [path: string]: string } = {};
    const input = new FileInput(getFileSystem(files), 'new.txt', true);
    expect(input.readAll()).toBe('');
    expect(files).toEqual({ 'new.txt': '' });
  });

  test('should not create a missing file by default', () => {
    const files: { [path: string]: string } = {};
    const input = new FileInput(getFileSystem(files), 'new.txt');
    expect(() => input.readAll()).toThrow();
    expect(files).toEqual({});
  });

  test('should not modify an existing file when create is set', () => {
    const files: { [path: string]: string } = { 'file.txt': 'hello' };
    const input = new FileInput(getFileSystem(files), 'file.txt', true);
    expect(input.readAll()).toBe('hello');
    expect(files).toEqual({ 'file.txt': 'hello' });
  });
});
