import { ICommandRunner } from './command_runner';
import { Context } from '../context';
import { RunCommandError } from '../error_exit_code';
import { WasmLoader } from '../wasm_loader';

export abstract class WasmCommandRunner implements ICommandRunner {
  constructor(readonly wasmLoader: WasmLoader) {}

  abstract moduleName(): string;

  abstract names(): string[];

  async run(cmdName: string, context: Context): Promise<number> {
    const { args, fileSystem, mountpoint, stdin, stdout, stderr } = context;

    const start = Date.now();
    const wasmModule = this.wasmLoader.getModule(this.moduleName());

    // Functions for monkey-patching.
    function getChar(tty: any) {
      const utf16codes = stdin.readChar();
      // What to do with length other than 1?
      const utf16 = utf16codes[0];
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

    const wasm = await wasmModule({
      thisProgram: cmdName,
      noInitialRun: true,
      print: (text: string) => stdout.write(`${text}\n`),
      printErr: (text: string) => stderr.write(`${text}\n`),
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
          context.environment.copyIntoCommand(module.ENV);
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
    const loaded = Date.now();

    if (!Object.prototype.hasOwnProperty.call(wasm, 'callMain')) {
      throw new RunCommandError(
        cmdName,
        "WASM module does not export 'callMain' so it cannot be called"
      );
    }

    const exitCode = wasm.callMain(args);

    if (Object.prototype.hasOwnProperty.call(wasm, 'FS')) {
      const FS = wasm.FS;
      FS.close(FS.streams[1]);
      FS.close(FS.streams[2]);
    }

    if (Object.prototype.hasOwnProperty.call(wasm, 'getEnvStrings')) {
      // Copy environment variables back from command.
      context.environment.copyFromCommand(wasm.getEnvStrings());
    }

    const end = Date.now();
    console.log(`${cmdName} load time ${loaded - start} ms, run time ${end - loaded} ms`);
    return exitCode;
  }
}
