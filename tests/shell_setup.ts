import { MockTerminalOutput } from "./util"
import { IFileSystem } from "../src/file_system"
import { Shell } from "../src/shell"

export interface IShellSetup {
  shell: Shell
  output: MockTerminalOutput
  fileSystem: IFileSystem
  FS: any
}

export async function shell_setup_empty(): Promise<IShellSetup> {
  return await _shell_setup_common(0)
}

export async function shell_setup_simple(): Promise<IShellSetup> {
  return await _shell_setup_common(1)
}

async function _shell_setup_common(level: number): Promise<IShellSetup> {
  const output = new MockTerminalOutput(false)
  const shell = new Shell(output.callback)
  const fileSystem = await shell.initFilesystem()
  const { FS } = fileSystem

  await shell.start()
  output.start()

  if (level > 0) {
    FS.writeFile('file1', 'Contents of the file');
    FS.writeFile('file2', 'Some other file\nSecond line');
    FS.mkdir('dirA')
  }

  return { shell, output, fileSystem, FS }
}
