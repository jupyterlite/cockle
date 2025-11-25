import type { IStdinContext } from './stdin_context';
import type { Aliases } from '../aliases';
import type { IWorkerIO } from '../buffered_io';
import type { ISizeCallback } from '../callback';
import type { ITerminateCallback } from '../callback_internal';
import type { CommandModuleCache, CommandRegistry } from '../commands';
import type { Environment } from '../environment';
import type { IFileSystem } from '../file_system';
import type { History } from '../history';
import type { IInput, IOutput } from '../io';
import type { Termios } from '../termios';

/**
 * Full context used to run builtin and WebAssembly commands.
 */
export interface IRunContext {
  name: string;
  args: string[];
  fileSystem: IFileSystem;
  environment: Environment;
  aliases: Aliases;
  commandRegistry: CommandRegistry;
  history: History;
  shellId: string;
  terminate: ITerminateCallback;
  stdin: IInput;
  stdout: IOutput;
  stderr: IOutput;
  size: ISizeCallback;
  termios: Termios.ITermios;
  workerIO: IWorkerIO;
  commandModuleCache: CommandModuleCache;
  stdinContext: IStdinContext;
}
