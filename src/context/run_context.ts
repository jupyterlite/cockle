import { IStdinContext } from './stdin_context';
import { Aliases } from '../aliases';
import { IWorkerIO } from '../buffered_io';
import { ISizeCallback } from '../callback';
import { ITerminateCallback } from '../callback_internal';
import { CommandModuleCache, CommandRegistry } from '../commands';
import { Environment } from '../environment';
import { IFileSystem } from '../file_system';
import { History } from '../history';
import { IInput, IOutput } from '../io';
import { Termios } from '../termios';

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
