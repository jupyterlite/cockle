import { IShell, Shell } from '@jupyterlite/cockle';
import { MockTerminalOutput } from './output_setup';

export interface IShellSetup {
  shell: Shell;
  output: MockTerminalOutput;
}

export interface IOptions {
  color?: boolean;
  initialDirectories?: string[];
  initialFiles?: IShell.IFiles;
}

export async function shell_setup_empty(options: IOptions = {}): Promise<IShellSetup> {
  return await _shell_setup_common(options, 0);
}

export async function shell_setup_simple(options: IOptions = {}): Promise<IShellSetup> {
  return await _shell_setup_common(options, 1);
}

async function _shell_setup_common(options: IOptions, level: number): Promise<IShellSetup> {
  const output = new MockTerminalOutput(false);

  const initialDirectories = options.initialDirectories ?? [];
  const initialFiles = options.initialFiles ?? {};
  if (level > 0) {
    initialDirectories.push('dirA');
    initialFiles['file1'] = 'Contents of the file';
    initialFiles['file2'] = 'Some other file\nSecond line';
  }

  const shell = new Shell({
    color: options.color ?? false,
    outputCallback: output.callback,
    wasmBaseUrl: 'http://localhost:8000/',
    initialDirectories,
    initialFiles
  });

  // Monkey patch an inputLine function to enter a sequence of characters and append a '\r'.
  // Cannot be used for multi-character ANSI escape codes.
  (shell as any).inputLine = async (line: string) => {
    for (const char of line) {
      await shell.input(char);
    }
    await shell.input('\r');
  };

  await shell.start();
  output.start();

  // Add a small sleep to avoid timing problems loading wasm modules.
  const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
  await sleep(20);

  return { shell, output };
}
