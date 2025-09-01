import { CommandModule } from './command_module';
import { CommandType } from './command_type';
import { DynamicallyLoadedCommandRunner } from './dynamically_loaded_command_runner';
import { IJavaScriptRunContext, IRunContext, ITabCompleteContext } from '../context';
import { FindCommandError, LoadCommandError, RunCommandError } from '../error_exit_code';
import { JavaScriptInput } from '../io';
import { ITabCompleteResult } from '../tab_complete';

export class JavascriptCommandRunner extends DynamicallyLoadedCommandRunner {
  constructor(readonly module: CommandModule) {
    super(module);
  }

  get commandType(): CommandType {
    return CommandType.JavaScript;
  }

  async run(context: IRunContext): Promise<number> {
    const { name } = context;
    const jsModule = this.module.loader.getJavaScriptModule(this.packageName, this.moduleName);
    if (jsModule === undefined) {
      throw new FindCommandError(name);
    }

    if (!Object.prototype.hasOwnProperty.call(jsModule, 'run')) {
      throw new LoadCommandError(name);
    }

    // Narrow context passed to JavaScript command so that we don't leak cockle internals.
    const { args, environment, fileSystem, stdout, stderr } = context;
    const stdin = new JavaScriptInput(context.stdin);
    const jsContext: IJavaScriptRunContext = {
      name,
      args,
      environment,
      fileSystem,
      stdin,
      stdout,
      stderr
    };

    try {
      return await jsModule.run(jsContext);
    } catch (err) {
      console.error(`JavascriptCommandRunner: ${err}`);
      throw new RunCommandError(name);
    }
  }

  async tabComplete(context: ITabCompleteContext): Promise<ITabCompleteResult> {
    const jsModule = this.module.loader.getJavaScriptModule(this.packageName, this.moduleName);
    if (jsModule !== undefined && Object.prototype.hasOwnProperty.call(jsModule, 'tabComplete')) {
      if (jsModule.tabComplete !== undefined) {
        const { name, args } = context;
        try {
          return await jsModule.tabComplete({ name, args });
        } catch (err) {
          // Do nothing, returns empty default below.
        }
      }
    }
    return {};
  }
}
