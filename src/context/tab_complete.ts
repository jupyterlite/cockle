import { CommandRegistry } from '../commands/command_registry';
import { IStdinContext } from '../context/stdin_context';

/**
 * Context within which to call ICommandRunner.tabComplete().
 */
export interface ITabCompleteContext {
  name: string;
  /**
   * Command arguments. The last argument is the one to tab complete and may be an empty string.
   */
  args: string[];

  // The following are typed as optional so that an IJavaScriptTabCompleteContext can be passed
  // around as an ITabCompleteContext. In reality they are always set for built-in commands.
  // Need to do this better.
  commandRegistry?: CommandRegistry;
  stdinContext?: IStdinContext;
}
