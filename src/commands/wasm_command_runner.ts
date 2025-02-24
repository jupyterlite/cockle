import { CommandModule } from './command_module';
import { DynamicallyLoadedCommandRunner } from './dynamically_loaded_command_runner';
import { IContext } from '../context';
import { ExitCode } from '../exit_code';
import { ITermios } from '../termios';

export class WasmCommandRunner extends DynamicallyLoadedCommandRunner {
  constructor(readonly module: CommandModule) {
    super(module);
  }

  async run(cmdName: string, context: IContext): Promise<number> {
    const { args, bufferedIO, fileSystem, stdin, stdout, stderr } = context;
    const { wasmBaseUrl } = this.module.loader;

    const start = Date.now();
    const wasmModule = this.module.loader.getModule(this.packageName, this.moduleName);

    let _getCharBuffer: number[] = [];

    // Functions for monkey-patching.
    function getChar(tty: any): number | null {
      if (_getCharBuffer.length > 0) {
        return _getCharBuffer.shift()!;
      }

      const utf16codes = stdin.readChar();
      const utf16 = utf16codes[0];
      if (utf16codes.length > 1) {
        _getCharBuffer = utf16codes.slice(1);
      }

      // What to do with length other than 1?
      if (utf16 === 4) {
        // EOT
        return null;
      } else {
        return utf16;
      }
    }

    function getTermios(tty: any): ITermios {
      const { termios } = bufferedIO;
      termios.log('Termios get');
      return termios.clone();
    }

    function setTermios(tty: any, optional_actions: any, data: ITermios) {
      // TODO: handle optional_actions
      bufferedIO.termios.set(data);
      return 0;
    }

    function getWindowSize(tty: any): [number, number] {
      return [
        context.environment.getNumber('LINES') ?? 24,
        context.environment.getNumber('COLUMNS') ?? 80
      ];
    }

    function poll(stream: any, timeoutMs: number): number {
      return bufferedIO.poll(timeoutMs);
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
      const text = bufferedIO.utf8ArrayToString(chars);
      const isStderr = stream.path === '/dev/tty1';

      if (isStderr && cmdName === 'touch' && args.length > 1) {
        // Crude hiding of many errors in touch command, really only want to hide
        // `touch: failed to close '${args[1]}': Bad file descriptor`
        // but that is sent as multiple write() calls.
        // The correct fix can be reintroduced when BufferedIO correctly line buffers output.
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
      thisProgram: cmdName,
      arguments: args,
      locateFile: (path: string) => wasmBaseUrl + this.packageName + '/' + path,
      onExit: (moduleExitCode: number) => setExitCode(moduleExitCode),
      quit: (moduleExitCode: number, toThrow: any) => setExitCode(moduleExitCode),
      preRun: [
        (module: any) => {
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
            context.environment.copyIntoCommand(module.ENV, stdout.supportsAnsiEscapes());
          }

          if (Object.prototype.hasOwnProperty.call(module, 'TTY')) {
            // Monkey patch get/set termios and get window size.
            module.TTY.default_tty_ops.ioctl_tcgets = getTermios;
            module.TTY.default_tty_ops.ioctl_tcsets = setTermios;
            module.TTY.default_tty_ops.ioctl_tiocgwinsz = getWindowSize;

            // May only need to be for some TTYs?
            module.TTY.stream_ops.write = write;
            module.TTY.stream_ops.poll = poll;

            // Monkey patch stdin get_char.
            const stdinDeviceId = module.FS.makedev(5, 0);
            const stdinTty = module.TTY.ttys[stdinDeviceId];
            stdinTty.ops.get_char = getChar;
          }
        }
      ]
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
        context.environment.copyFromCommand(wasm.getEnvStrings());
      }
    }

    const end = Date.now();
    console.log(`Cockle ${cmdName} load and run time ${end - start} ms`);
    return exitCode;
  }
}
