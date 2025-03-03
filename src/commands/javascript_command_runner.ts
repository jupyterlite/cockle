import { CommandModule } from './command_module';
import { DynamicallyLoadedCommandRunner } from './dynamically_loaded_command_runner';
import { IContext } from '../context';
import { FindCommandError, LoadCommandError, RunCommandError } from '../error_exit_code';

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

    try {
      return await jsModule.run(cmdName, context);
    } catch {
      throw new RunCommandError(cmdName);
    }
  }
}
