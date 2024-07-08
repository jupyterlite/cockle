import { MockTerminalOutput } from "./util"
import { Shell } from "../src/shell"

export interface IShellSetup {
  shell: Shell
  output: MockTerminalOutput
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
  const { FS } = await shell.initFilesystem()

  await shell.start()
  output.start()

  if (level > 0) {
    FS.writeFile('file1', 'Contents of the file');
    FS.writeFile('file2', 'Some other file\nSecond line');
    FS.mkdir('dirA')
  }

  return { shell, output, FS }
}
