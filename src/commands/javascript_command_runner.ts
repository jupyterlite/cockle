import type { CommandModule } from './command_module';
import { CommandType } from './command_type';
import { DynamicallyLoadedCommandRunner } from './dynamically_loaded_command_runner';
import type {
  IJavaScriptRunContext,
  IRunContext,
  IServices,
  ITabCompleteContext
} from '../context';
import { FindCommandError, LoadCommandError, RunCommandError } from '../error_exit_code';
import { JavaScriptInput } from '../io';
import { Pager } from '../pager';
import type { IPosixSignalCallback, PosixSignal } from '../posix_signal';
import { callPosixSignalCallback, setPosixSignalCallback } from '../posix_signal';
import type { ITabCompleteResult } from '../tab_complete';

export class JavascriptCommandRunner extends DynamicallyLoadedCommandRunner {
  constructor(readonly module: CommandModule) {
    super(module);
  }

  get commandType(): CommandType {
    return CommandType.JavaScript;
  }

  async run(context: IRunContext): Promise<number> {
    const { name, args } = context;

    const jsModule = await this.module.loader.getJavaScriptModule(
      this.packageName,
      this.moduleName
    );
    if (jsModule === undefined) {
      throw new FindCommandError(name);
    }

    if (!Object.prototype.hasOwnProperty.call(jsModule, 'run')) {
      throw new LoadCommandError(name);
    }

    // Services that use the narrowed jsContext below.
    const services: IServices = {
      createPager: () => new Pager({ context: jsContext })
    };

    // Narrow context passed to JavaScript command so that we don't leak cockle internals.
    const { commandId, environment, fileSystem, shellId, stdout, stderr, termios, size } = context;
    const stdin = new JavaScriptInput(context.stdin);
    const posixSignalCallbacks = new Map<PosixSignal, IPosixSignalCallback>();
    const jsContext: IJavaScriptRunContext = {
      name,
      args,
      environment,
      fileSystem,
      onPosixSignal: (signal, callback) => {
        // The context's callbacks are wrapped so that they do not wait for the command's callback.
        setPosixSignalCallback(
          context.posixSignalCallbacks,
          signal,
          callback && (() => callPosixSignalCallback(callback, signal))
        );
        return setPosixSignalCallback(posixSignalCallbacks, signal, callback);
      },
      shellId,
      stdin,
      stdout,
      stderr,
      size,
      termios,
      services
    };

    context.commandRegistry.commandStateChangedCallback({ commandId, state: 'running' });

    try {
      return await jsModule.run(jsContext);
    } catch (err) {
      console.error(`JavascriptCommandRunner: ${err}`);
      throw new RunCommandError(name);
    }
  }

  async tabComplete(context: ITabCompleteContext): Promise<ITabCompleteResult> {
    const jsModule = await this.module.loader.getJavaScriptModule(
      this.packageName,
      this.moduleName
    );
    if (jsModule !== undefined && Object.prototype.hasOwnProperty.call(jsModule, 'tabComplete')) {
      if (jsModule.tabComplete !== undefined) {
        const { name, args, shellId } = context;
        try {
          return await jsModule.tabComplete({ name, args, shellId });
        } catch (err) {
          // Do nothing, returns empty default below.
        }
      }
    }
    return {};
  }
}
