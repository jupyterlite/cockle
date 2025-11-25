import { CommandModule } from './command_module';
import { CommandType } from './command_type';
import { DynamicallyLoadedCommandRunner } from './dynamically_loaded_command_runner';
import { IRunContext } from '../context';
import { FindCommandError } from '../error_exit_code';
import { ExitCode } from '../exit_code';
import { IOutput } from '../io';
import { Termios } from '../termios';
import type { MainModule } from '../types/wasm_module';
import { joinURL } from '../utils';

export class WasmCommandRunner extends DynamicallyLoadedCommandRunner {
  constructor(readonly module: CommandModule) {
    super(module);
  }

  get commandType(): CommandType {
    return CommandType.Wasm;
  }

  async run(context: IRunContext): Promise<number> {
    const { name, args, workerIO, fileSystem, stdin, stdout, stderr, termios, size } = context;
    const { wasmBaseUrl } = this.module.loader;

    const start = Date.now();
    const wasmModule = this.module.loader.getWasmModule(this.packageName, this.moduleName);
    if (wasmModule === undefined) {
      throw new FindCommandError(name);
    }

    function getTermios(tty: any): Termios.IFlags {
      return termios.get();
    }

    function setTermios(tty: any, optional_actions: any, data: Termios.IFlags) {
      // TODO: handle optional_actions
      termios.set(data);
      return 0;
    }

    function getSize(tty: any): [number, number] {
      return size();
    }

    function poll(stream: any, timeoutMs: number): number {
      return workerIO.poll(timeoutMs);
    }

    function read(
      stream: any,
      buffer: Int8Array,
      offset: number,
      length: number,
      position: any
    ): number {
      if (length === 0) {
        // No buffer to store in.
        return 0;
      }
      let chars = stdin.read(length);
      if (chars.length === 1 && chars[0] === 4) {
        chars = [];
      }
      // Should check have enough space to store new chars.
      buffer.set(chars, offset);
      return chars.length;
    }

    function write(
      stream: any,
      buffer: Int8Array,
      offset: number,
      length: number,
      pos: any
    ): number {
      if (length === 0) {
        return 0;
      }

      const chars = buffer.slice(offset, offset + length);
      const text = workerIO.utf8ArrayToString(chars);
      const isStderr = stream.path === '/dev/tty1';

      if (isStderr && name === 'touch' && args.length > 1) {
        // Crude hiding of many errors in touch command, really only want to hide
        // `touch: failed to close '${args[1]}': Bad file descriptor`
        // but that is sent as multiple write() calls.
        // The correct fix can be reintroduced when WorkerIO correctly line buffers output.
        return length;
      }

      const output = isStderr ? stderr : stdout;
      output.write(text);
      return length;
    }

    let exitCode: number | undefined;

    function setExitCode(moduleExitCode: number) {
      if (exitCode === undefined) {
        exitCode = moduleExitCode;
      }
    }

    const wasm = await wasmModule({
      thisProgram: name,
      arguments: args,
      locateFile: (path: string) => joinURL(wasmBaseUrl, this.packageName + '/' + path),
      onExit: (moduleExitCode: number) => setExitCode(moduleExitCode),
      quit: (moduleExitCode: number, toThrow: any) => setExitCode(moduleExitCode),
      preRun: [
        (module: MainModule) => {
          if (Object.prototype.hasOwnProperty.call(module, 'FS')) {
            // Use PROXYFS so that command sees the shared FS.
            const FS = module.FS;
            const { mountpoint } = fileSystem;
            FS.mkdir(mountpoint, 0o777);
            FS.mount(fileSystem.PROXYFS, { root: mountpoint, fs: fileSystem.FS }, mountpoint);
            FS.chdir(fileSystem.FS.cwd());
          }

          if (Object.prototype.hasOwnProperty.call(module, 'ENV')) {
            // Copy environment variables into command.
            context.environment.copyIntoCommand(module.ENV!, stdout.isTerminal());
          }

          if (Object.prototype.hasOwnProperty.call(module, 'TTY')) {
            // Monkey patch get/set termios and get window size.
            module.TTY.default_tty_ops.ioctl_tcgets = getTermios;
            module.TTY.default_tty_ops.ioctl_tcsets = setTermios;
            module.TTY.default_tty_ops.ioctl_tiocgwinsz = getSize;

            // May only need to be for some TTYs?
            module.TTY.stream_ops.poll = poll;
            module.TTY.stream_ops.read = read;
            module.TTY.stream_ops.write = write;
          }
        }
      ],
      stderr: this._outputHandler(stderr),
      stdout: this._outputHandler(stdout)
    });

    if (exitCode === undefined) {
      exitCode = ExitCode.CANNOT_RUN_COMMAND;
    } else {
      if (Object.prototype.hasOwnProperty.call(wasm, 'FS')) {
        const FS = wasm.FS;
        for (const stream of [FS.streams[1], FS.streams[2]]) {
          if (stream !== null && !FS.isClosed(stream)) {
            FS.close(stream);
          }
        }
      }

      if (Object.prototype.hasOwnProperty.call(wasm, 'getEnvStrings')) {
        // Copy environment variables back from command.
        context.environment.copyFromCommand(wasm.getEnvStrings!());
      }
    }

    const end = Date.now();
    console.debug(`Cockle ${name} load and run time ${end - start} ms`);
    return exitCode;
  }

  /**
   * By default a WebAssembly command assumes stdout and stderr are terminals (TTYs).
   * If this is not the case, need to provide an output writing wrapper.
   * With this, WebAssembly commands can use `isatty` correctly.
   */
  private _outputHandler(output: IOutput): ((x: number) => void) | undefined {
    if (!output.isTerminal()) {
      return (x: number) => output.write(String.fromCharCode(x));
    }
    return undefined;
  }
}
