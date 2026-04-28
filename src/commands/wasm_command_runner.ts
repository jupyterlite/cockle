import type { CommandModule } from './command_module';
import { CommandType } from './command_type';
import { DynamicallyLoadedCommandRunner } from './dynamically_loaded_command_runner';
import type { IRunContext } from '../context';
import { FindCommandError } from '../error_exit_code';
import { ExitCode } from '../exit_code';
import type { IInput, IOutput } from '../io';
import type { Termios } from '../termios';
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
    const avoidInfinitePollTimeout = name === 'less';

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
      // Constants.
      const POLLIN = 1;
      const POLLOUT = 4;

      if (avoidInfinitePollTimeout && timeoutMs < 0) {
        // `less` polls multiple file descriptors at the same time with infinite timeout which end
        // up running sequentially here, workaround is for them to return immediately.
        timeoutMs = 0;
      }

      const readable = stdin.finished ? workerIO.pollInput(timeoutMs) : stdin.poll(timeoutMs);
      const writable = true;
      return (readable ? POLLIN : 0) | (writable ? POLLOUT : 0);
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
      let chars = stdin.finished ? workerIO.read(length) : stdin.read(length);
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
          const { ENV, FS, TTY } = module;
          if (FS !== undefined) {
            const FS = module.FS;
            const { mountpoint } = fileSystem;
            FS.mkdir(mountpoint, 0o777);
            // Use PROXYFS so that command sees the shared FS.
            FS.mount(
              module.PROXYFS ?? fileSystem.PROXYFS,
              { root: mountpoint, fs: fileSystem.FS },
              mountpoint
            );
            FS.chdir(fileSystem.FS.cwd());
          }

          if (ENV !== undefined) {
            // Copy environment variables into command.
            context.environment.copyIntoCommand(module.ENV!);
          }

          if (TTY !== undefined) {
            const { default_tty_ops, default_tty1_ops, stream_ops } = module.TTY;

            // Monkey patch get/set termios and get window size.
            default_tty_ops.ioctl_tcgets = getTermios;
            default_tty_ops.ioctl_tcsets = setTermios;
            default_tty_ops.ioctl_tiocgwinsz = getSize;

            default_tty1_ops.ioctl_tcgets = getTermios;
            default_tty1_ops.ioctl_tcsets = setTermios;
            default_tty1_ops.ioctl_tiocgwinsz = getSize;

            // May only need to be for some TTYs?
            stream_ops.poll = poll;
            stream_ops.read = read;
            stream_ops.write = write;
          }
        }
      ],
      stdin: this._inputHandler(stdin),
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
    }

    const end = Date.now();
    console.debug(`Cockle ${name} load and run time ${end - start} ms`);
    return exitCode;
  }

  /**
   * By default a WebAssembly command assumes stdin, stdout and stderr are terminals (TTYs).
   * If this is not the case, provide an input reading or output writing wrapper.
   * With this, WebAssembly commands can use `isatty` correctly.
   */
  private _inputHandler(input: IInput): (() => number | null | undefined) | undefined {
    if (!input.isTerminal()) {
      return () => {
        const read = input.read(1);
        return read.length > 0 ? read[0] : null;
      };
    }
    return undefined;
  }

  private _outputHandler(output: IOutput): ((x: number) => void) | undefined {
    if (!output.isTerminal()) {
      return (x: number) => output.write(String.fromCharCode(x));
    }
    return undefined;
  }
}
