import { IExternalCommand, IShell, Shell, ShellManager } from '@jupyterlite/cockle';
import { MockTerminalOutput } from './output_setup';

export interface IShellSetup {
  shell: IShell;
  output: MockTerminalOutput;
}

export interface IOptions {
  color?: boolean;
  aliases?: { [key: string]: string };
  environment?: { [key: string]: string | undefined };
  externalCommands?: IExternalCommand.IOptions[];
  initialDirectories?: string[];
  initialFiles?: IShell.IFiles;
  shellId?: string;
  shellManager?: ShellManager;
  stdinOption?: string; // Set initial synchronous stdin option,
}

export async function shellSetupEmpty(options: IOptions = {}): Promise<IShellSetup> {
  return await _shellSetupCommon(options, 0);
}

export async function shellSetupSimple(options: IOptions = {}): Promise<IShellSetup> {
  return await _shellSetupCommon(options, 1);
}

export async function shellSetupComplex(options: IOptions = {}): Promise<IShellSetup> {
  return await _shellSetupCommon(options, 2);
}

async function _shellSetupCommon(options: IOptions, level: number): Promise<IShellSetup> {
  const output = new MockTerminalOutput(false);

  const initialDirectories = options.initialDirectories ?? [];
  const initialFiles = options.initialFiles ?? {};
  if (level === 1) {
    // 📁 dirA
    // 📄 file1
    // 📄 file2
    initialDirectories.push('dirA');
    initialFiles['file1'] = 'Contents of the file';
    initialFiles['file2'] = 'Some other file\nSecond line';
  } else if (level === 2) {
    // 📄 file1.txt
    // 📄 file2.txt
    // 📄 otherfile
    // 📁 dir
    // ├── 📄 subfile.txt
    // ├── 📄 subfile.md
    // └── 📁 subdir
    //     └── 📄 nestedfile
    initialDirectories.push('dir');
    initialDirectories.push('dir/subdir');
    initialFiles['file1.txt'] = '';
    initialFiles['file2.txt'] = '';
    initialFiles['otherfile'] = '';
    initialFiles['dir/subfile.txt'] = '';
    initialFiles['dir/subfile.md'] = '';
    initialFiles['dir/subdir/nestedfile'] = '';
  }

  const baseUrl = 'http://localhost:8000/';
  const { aliases, environment, externalCommands, shellId, stdinOption } = options;
  let { shellManager } = options;
  if (stdinOption !== undefined && shellManager === undefined) {
    shellManager = new ShellManager();
  }

  let browsingContextId: string | undefined;
  if (shellManager !== undefined) {
    browsingContextId = await shellManager.installServiceWorker(baseUrl);
  }

  const shell = new Shell({
    color: options.color ?? false,
    outputCallback: output.callback,
    baseUrl,
    wasmBaseUrl: baseUrl,
    browsingContextId,
    aliases,
    environment,
    externalCommands,
    shellId,
    shellManager,
    initialDirectories,
    initialFiles
  });

  // Monkey patch an inputLine function to enter a sequence of characters and append a '\r'.
  // Cannot be used for multi-character ANSI escape codes.
  const inputLine = async (line: string) => {
    for (const char of line) {
      await shell.input(char);
    }
    await shell.input('\r');
  };
  (shell as any).inputLine = inputLine;

  await shell.start();
  await shell.setSize(24, 80);

  if (stdinOption) {
    // Set initial synchronous stdin option before enabling recording of output.
    await inputLine(`cockle-config -s ${stdinOption}`);
  }

  output.start();

  return { shell, output };
}
