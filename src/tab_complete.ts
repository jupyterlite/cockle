import { CommandRegistry } from './commands/command_registry';
import { IStdinContext } from './context/stdin_context';

/**
 * Context within which to call ICommandRunner.tabComplete().
 */
export interface ITabCompleteContext {
  /**
   * Command arguments. The last argument is the one to tab complete and may be an empty string.
   */
  args: string[];

  commandRegistry: CommandRegistry;
  stdinContext: IStdinContext;
}

/**
 * Enum to find possible matching file and/or directory names.
 */
export enum PathMatch {
  Any = 0,
  Directory = 1,
  File = 2
}

/**
 * Result of an ICommandRunner.tabComplete() call.
 */
export interface ITabCompleteResult {
  possibles?: string[];
  pathMatch?: PathMatch;
}
