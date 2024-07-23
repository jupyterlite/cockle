import { MockTerminalOutput } from './util';
import { IEnableBufferedStdinCallback, IFileSystem, IStdinCallback, Shell } from '../src';

export interface IShellSetup {
  shell: Shell;
  output: MockTerminalOutput;
  fileSystem: IFileSystem;
  FS: any;
}

export interface IOptions {
  wantColor?: boolean;
  enableBufferedStdinCallback?: IEnableBufferedStdinCallback;
  stdinCallback?: IStdinCallback;
}

export async function shell_setup_empty(options: IOptions = {}): Promise<IShellSetup> {
  return await _shell_setup_common(options, 0);
}

export async function shell_setup_simple(options: IOptions = {}): Promise<IShellSetup> {
  return await _shell_setup_common(options, 1);
}

async function _shell_setup_common(options: IOptions, level: number): Promise<IShellSetup> {
  const output = new MockTerminalOutput(false);
  const shell = new Shell({
    outputCallback: output.callback,
    enableBufferedStdinCallback: options.enableBufferedStdinCallback,
    stdinCallback: options.stdinCallback
  });
  const fileSystem = await shell.initFilesystem();
  const { FS } = fileSystem;

  const wantColor = options.wantColor ?? false;
  if (!wantColor) {
    // TODO: disable color in the prompt.
    const { environment } = shell;
    environment.delete('TERM');
  }

  await shell.start();
  output.start();

  if (level > 0) {
    FS.writeFile('file1', 'Contents of the file', { mode: 0o664 });
    FS.writeFile('file2', 'Some other file\nSecond line', { mode: 0o664 });
    FS.mkdir('dirA', 0o775);
  }

  return { shell, output, fileSystem, FS };
}
