import type { CommandModule } from './command_module';
import { CommandType } from './command_type';
import { DynamicallyLoadedCommandRunner } from './dynamically_loaded_command_runner';
import { Utf8InputBuffer } from './utf8_input_buffer';
import type { IRunContext } from '../context';
import { FindCommandError } from '../error_exit_code';
import { ExitCode } from '../exit_code';
import type { IInput, IOutput } from '../io';
import { SharedFS } from '../shared_fs';
import type { Termios } from '../termios';
import type { MainModule } from '../types/wasm_module';
import { joinURL } from '../utils';

/**
 * Number of characters of stdin to read and convert to UTF-8 at a time. Reading and converting
 * characters in chunks is much faster than one character at a time.
 */
const INPUT_CHARS_PER_READ = 8192;

export class WasmCommandRunner extends DynamicallyLoadedCommandRunner {
  constructor(readonly module: CommandModule) {
    super(module);
  }

  get commandType(): CommandType {
    return CommandType.Wasm;
  }

  async run(context: IRunContext): Promise<number> {
    const { name, args, workerIO, commandId, fileSystem, stdin, stdout, stderr, termios, size } =
      context;
    const { wasmBaseUrl } = this.module.loader;
    const { commandStateChangedCallback } = context.commandRegistry;
    const avoidInfinitePollTimeout = name === 'less';

    const start = performance.now();
    const wasmModule = await this.module.loader.getWasmModule(this.packageName, this.moduleName);
    if (wasmModule === undefined) {
      throw new FindCommandError(name);
    }

    // Buffer which converts the UTF-16 characters of stdin into the UTF-8 bytes of a wasm
    // command, retaining bytes which do not fit in a read buffer until the next read.
    const inputBytes = new Utf8InputBuffer();

    // Read characters from stdin for the wasm command. Defined once because it is called many
    // times as the command reads its input.
    function readCharsFromStdin(maxChars: number): number[] {
      let chars = stdin.finished ? workerIO.read(maxChars) : stdin.read(maxChars);
      if (chars.length === 1 && chars[0] === 4) {
        // End of text (e.g. Ctrl+D typed at the terminal): treat as the end of the input.
        chars = [];
      }
      return chars;
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
      const { rows, columns } = size();
      return [rows, columns];
    }

    function poll(stream: any, timeoutMs: number): number {
      // Constants.
      const POLLIN = 1;
      const POLLOUT = 4;

      // Emscripten 6 calls poll(stream) without a timeout, treat this as non-blocking.
      timeoutMs ??= 0;

      if (avoidInfinitePollTimeout && timeoutMs < 0) {
        // `less` polls multiple file descriptors at the same time with infinite timeout which end
        // up running sequentially here, workaround is for them to return immediately.
        timeoutMs = 0;
      }

      let readable = inputBytes.length > 0;
      if (!readable) {
        readable = stdin.finished ? workerIO.pollInput(timeoutMs) : stdin.poll(timeoutMs);
      }
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

      if (inputBytes.length === 0) {
        inputBytes.fill(readCharsFromStdin, length);
      }

      // Do not pass more bytes to the wasm command than fit in the buffer.
      const bytes = inputBytes.take(length);
      buffer.set(bytes, offset);
      return bytes.length;
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

      const chars = buffer.subarray(offset, offset + length);
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

    // Output handlers which buffer bytes until a line ends or the command has finished. A single
    // handler is used when stdout and stderr are the same stream (e.g. 'cmd &> file') so that the
    // bytes are kept in the order the command wrote them.
    const stdoutHandler = this._outputHandler(stdout);
    const stderrHandler = stdout === stderr ? stdoutHandler : this._outputHandler(stderr);

    const wasm = await wasmModule({
      thisProgram: name,
      arguments: args,
      locateFile: (path: string) => {
        return joinURL(wasmBaseUrl, this.packageName + '/' + path);
      },
      onExit: (moduleExitCode: number) => setExitCode(moduleExitCode),
      quit: (moduleExitCode: number, toThrow: any) => setExitCode(moduleExitCode),
      preRun: [
        (module: MainModule) => {
          const { ENV, FS, TTY } = module;

          if (FS !== undefined) {
            const sharedFS = fileSystem.FS;
            const PROXYFS = module.PROXYFS ?? fileSystem.PROXYFS;

            // Proxy directories from shared file system into wasm command file system.
            const excluded = [...SharedFS.WASM_DIRECTORIES_NOT_SHARED, '/..', '/.'];
            const dirsToProxy = (sharedFS.readdir('/') as string[])
              .map(name => `/${name}`)
              .filter(name => !excluded.includes(name));
            dirsToProxy.forEach(dirToProxy => {
              try {
                if (FS.analyzePath(dirToProxy).exists) {
                  FS.chmod(dirToProxy, SharedFS.TOP_LEVEL_DIRECTORY_PERMISSIONS);
                } else {
                  FS.mkdir(dirToProxy, SharedFS.TOP_LEVEL_DIRECTORY_PERMISSIONS);
                }
                FS.mount(PROXYFS, { root: dirToProxy, fs: sharedFS }, dirToProxy);
              } catch (err: any) {
                console.error(`Failed to proxy directory ${dirToProxy}`);
              }
            });

            // Set permissions of wasm directories that are not proxied.
            SharedFS.WASM_DIRECTORIES_NOT_SHARED.forEach(dir => {
              try {
                FS.chmod(dir, SharedFS.TOP_LEVEL_DIRECTORY_PERMISSIONS);
              } catch (err: any) {
                console.error(`Failed to chmod ${dir}`);
              }
            });

            // Set permissions of root directory.
            try {
              FS.chmod('/', SharedFS.ROOT_DIRECTORY_PERMISSIONS);
            } catch (err: any) {
              console.error('Failed to chmod of root directory');
            }

            FS.chdir(sharedFS.cwd());
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

          commandStateChangedCallback({ commandId, state: 'running' });
        }
      ],
      stdin: this._inputHandler(stdin, inputBytes),
      stderr: stderrHandler?.write,
      stdout: stdoutHandler?.write
    });

    // Flush the remaining output bytes.
    stdoutHandler?.flush();
    stderrHandler?.flush();

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

    const end = performance.now();
    console.debug(`Cockle ${name} load and run time ${(end - start).toFixed(1)} ms`);
    return exitCode;
  }

  /**
   * By default a WebAssembly command assumes stdin, stdout and stderr are terminals (TTYs).
   * If this is not the case, provide an input reading or output writing wrapper.
   * With this, WebAssembly commands can use `isatty` correctly.
   * The wrapper returns the UTF-8 bytes expected by the WebAssembly command, one byte at a time.
   */
  private _inputHandler(
    input: IInput,
    inputBytes: Utf8InputBuffer
  ): (() => number | null | undefined) | undefined {
    if (!input.isTerminal()) {
      const readChars = (maxChars: number) => input.read(maxChars);
      return () => {
        inputBytes.fill(readChars, INPUT_CHARS_PER_READ);
        return inputBytes.readByte();
      };
    }
    return undefined;
  }

  /**
   * The WebAssembly command writes UTF-8 bytes, one at a time. Decode them to characters using a
   * streaming decoder, as a multi-byte character may be split over multiple calls, and batch the
   * bytes before passing them to the output. The returned write function must be called with one
   * byte at a time, then flush() must be called when the command has finished.
   */
  private _outputHandler(
    output: IOutput
  ): { write: (x: number) => void; flush: () => void } | undefined {
    if (output.isTerminal()) {
      return undefined;
    }

    const decoder = new TextDecoder('utf-8');
    const staging = new Uint8Array(1024);
    let count = 0;

    const flush = (final: boolean) => {
      let text = '';
      if (count > 0) {
        text = decoder.decode(staging.subarray(0, count), { stream: !final });
        count = 0;
      } else if (final) {
        // Emit the replacement character for an incomplete character at the end of the output.
        text = decoder.decode();
      }
      if (text.length > 0) {
        output.write(text);
      }
    };

    return {
      write: (x: number) => {
        staging[count++] = x;
        if (count === staging.length || x === 10) {
          // Flush when the buffer is full, or at the end of a line, so that the output is
          // available incrementally.
          flush(false);
        }
      },
      flush: () => flush(true)
    };
  }
}
