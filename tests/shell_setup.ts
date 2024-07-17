import { MockTerminalOutput } from "./util"
import { IFileSystem } from "../src/file_system"
import { Shell } from "../src/shell"

export interface IShellSetup {
  shell: Shell
  output: MockTerminalOutput
  fileSystem: IFileSystem
  FS: any
}

export async function shell_setup_empty(wantColor: boolean = false): Promise<IShellSetup> {
  return await _shell_setup_common(wantColor, 0)
}

export async function shell_setup_simple(wantColor: boolean = false): Promise<IShellSetup> {
  return await _shell_setup_common(wantColor, 1)
}

async function _shell_setup_common(wantColor: boolean, level: number): Promise<IShellSetup> {
  const output = new MockTerminalOutput(false)
  const shell = new Shell(output.callback)
  const fileSystem = await shell.initFilesystem()
  const { FS } = fileSystem

  if (!wantColor) {
    // TODO: disable color in the prompt.
    const { environment } = shell
    environment.delete("TERM")
  }

  await shell.start()
  output.start()

  if (level > 0) {
    FS.writeFile('file1', 'Contents of the file', { mode: 0o664 });
    FS.writeFile('file2', 'Some other file\nSecond line', { mode: 0o664 });
    FS.mkdir('dirA', 0o775)
  }

  return { shell, output, fileSystem, FS }
}
