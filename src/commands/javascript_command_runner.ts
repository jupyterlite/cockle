import { CommandModule } from './command_module';
import { DynamicallyLoadedCommandRunner } from './dynamically_loaded_command_runner';
import { IContext } from '../context';
import { FindCommandError, LoadCommandError, RunCommandError } from '../error_exit_code';
import { JavaScriptInput } from '../io';
import { IJavaScriptContext } from '../javascript_context';

export class JavascriptCommandRunner extends DynamicallyLoadedCommandRunner {
  constructor(readonly module: CommandModule) {
    super(module);
  }

  async run(cmdName: string, context: IContext): Promise<number> {
    const jsModule = this.module.loader.getJavaScriptModule(this.packageName, this.moduleName);
    if (jsModule === undefined) {
      throw new FindCommandError(cmdName);
    }

    if (!Object.prototype.hasOwnProperty.call(jsModule, 'run')) {
      throw new LoadCommandError(cmdName);
    }

    // Narrow context passed to JavaScript command so that we don't leak cockle internals.
    const { args, environment, fileSystem, stdout, stderr } = context;
    const stdin = new JavaScriptInput(context.stdin);
    const jsContext: IJavaScriptContext = { args, environment, fileSystem, stdin, stdout, stderr };

    try {
      return await jsModule.run(cmdName, jsContext);
    } catch {
      throw new RunCommandError(cmdName);
    }
  }
}
