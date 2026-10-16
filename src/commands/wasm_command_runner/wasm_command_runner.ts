import { initEnvironment, initFileSystem } from './initialization';
import { createOutputHandler, createStdinHandler } from './io_handlers';
import { WasmTty } from './tty';
import { Utf8InputBuffer } from './utf8_input_buffer';
import type { IRunContext } from '../../context';
import { FindCommandError } from '../../error_exit_code';
import { ExitCode } from '../../exit_code';
import type { MainModule } from '../../types/wasm_module';
import { joinURL } from '../../utils';
import type { CommandModule } from '../command_module';
import { CommandType } from '../command_type';
import { DynamicallyLoadedCommandRunner } from '../dynamically_loaded_command_runner';

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

    const inputBytes = new Utf8InputBuffer();
    const tty = new WasmTty(
      stdin,
      stdout,
      stderr,
      workerIO,
      termios,
      size,
      inputBytes,
      avoidInfinitePollTimeout
    );

    let exitCode: number | undefined;

    function setExitCode(moduleExitCode: number) {
      if (exitCode === undefined) {
        exitCode = moduleExitCode;
      }
    }

    // Output handlers which buffer bytes until a line ends or the command has finished. A single
    // handler is used when stdout and stderr are the same stream (e.g. 'cmd &> file') so that the
    // bytes are kept in the order the command wrote them.
    const stdoutHandler = createOutputHandler(stdout);
    const stderrHandler = stdout === stderr ? stdoutHandler : createOutputHandler(stderr);

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
          initFileSystem(module, fileSystem);
          initEnvironment(module, context.environment);
          tty.attach(module);
          commandStateChangedCallback({ commandId, state: 'running' });
        }
      ],
      stdin: createStdinHandler(stdin, inputBytes),
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
}
