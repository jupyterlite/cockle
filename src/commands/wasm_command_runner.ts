import { ICommandRunner } from './command_runner';
import { Context } from '../context';
import { ExitCode } from '../exit_code';
import { WasmLoader } from '../wasm_loader';

export class WasmCommandRunner implements ICommandRunner {
  constructor(
    readonly wasmLoader: WasmLoader,
    readonly _moduleName: string,
    readonly _commandNames: string[]
  ) {}

  moduleName(): string {
    return this._moduleName;
  }

  names(): string[] {
    return this._commandNames;
  }

  async run(cmdName: string, context: Context): Promise<number> {
    const { args, fileSystem, mountpoint, stdin, stdout, stderr } = context;
    const { wasmBaseUrl } = this.wasmLoader;

    const start = Date.now();
    const wasmModule = this.wasmLoader.getModule(this.moduleName());

    // Functions for monkey-patching.
    function getChar(tty: any) {
      const utf16codes = stdin.readChar();
      const utf16 = utf16codes[0];

      if (stdin.isTerminal()) {
        if (utf16 === 10) {
          context.stdout.write('\n');
          context.stdout.flush();
        } else if (utf16 > 31 && utf16 !== 127) {
          context.stdout.write(String.fromCharCode(...utf16codes));
          context.stdout.flush();
        }
      }

      // What to do with length other than 1?
      if (utf16 === 4) {
        // EOT
        return null;
      } else {
        return utf16;
      }
    }

    function getWindowSize(tty: any): [number, number] {
      return [
        context.environment.getNumber('LINES') ?? 24,
        context.environment.getNumber('COLUMNS') ?? 80
      ];
    }

    let exitCode: number | undefined;

    const wasm = await wasmModule({
      thisProgram: cmdName,
      arguments: args,
      locateFile: (path: string) => wasmBaseUrl + path,
      print: (text: string) => stdout.write(`${text}\n`),
      printErr: (text: string) => {
        if (
          cmdName === 'touch' &&
          text === `touch: failed to close '${args[1]}': Bad file descriptor`
        ) {
          // Temporarily ignore bad file descriptor error in touch command until have proper fix.
          // Command will still return an exit code of 1.
          return;
        }
        stderr.write(`${text}\n`);
      },
      quit: (moduleExitCode: number, toThrow: any) => {
        if (exitCode === undefined) {
          exitCode = moduleExitCode;
        }
      },
      preRun: (module: any) => {
        if (Object.prototype.hasOwnProperty.call(module, 'FS')) {
          // Use PROXYFS so that command sees the shared FS.
          const FS = module.FS;
          FS.mkdir(mountpoint, 0o777);
          FS.mount(fileSystem.PROXYFS, { root: mountpoint, fs: fileSystem.FS }, mountpoint);
          FS.chdir(fileSystem.FS.cwd());
        }

        if (Object.prototype.hasOwnProperty.call(module, 'ENV')) {
          // Copy environment variables into command.
          context.environment.copyIntoCommand(module.ENV, stdout.supportsAnsiEscapes());
        }

        if (Object.prototype.hasOwnProperty.call(module, 'TTY')) {
          // Monkey patch window size.
          module.TTY.default_tty_ops.ioctl_tiocgwinsz = getWindowSize;

          // Monkey patch stdin get_char.
          const stdinDeviceId = module.FS.makedev(5, 0);
          const stdinTty = module.TTY.ttys[stdinDeviceId];
          stdinTty.ops.get_char = getChar;
        }
      }
    });

    if (exitCode === undefined) {
      exitCode = ExitCode.CANNOT_RUN_COMMAND;
    } else {
      if (Object.prototype.hasOwnProperty.call(wasm, 'FS')) {
        const FS = wasm.FS;
        FS.close(FS.streams[1]);
        FS.close(FS.streams[2]);
      }

      if (Object.prototype.hasOwnProperty.call(wasm, 'getEnvStrings')) {
        // Copy environment variables back from command.
        context.environment.copyFromCommand(wasm.getEnvStrings());
      }
    }

    const end = Date.now();
    console.log(`${cmdName} load and run time ${end - start} ms`);
    return exitCode;
  }
}
