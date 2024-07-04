import { MockTerminalOutput } from "./util"
import { Shell } from "../src/shell"

export async function shell_setup_empty(): Promise<[Shell, MockTerminalOutput]> {
  return await _shell_setup_common(0)
}

export async function shell_setup_simple(): Promise<[Shell, MockTerminalOutput]> {
  return await _shell_setup_common(1)
}

async function _shell_setup_common(level: number): Promise<[Shell, MockTerminalOutput]> {
  const output = new MockTerminalOutput(false)
  const shell = new Shell(output.callback)
  const { FS } = await shell.initFilesystem()

  await shell.start()
  output.start()

  if (level > 0) {
    FS.writeFile('file1', 'Contents of the file');
    FS.writeFile('file2', 'Some other file');
    FS.mkdir('dirA')
  }

  return [shell, output]
}
