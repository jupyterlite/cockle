import { IRunContext } from '../context';
import { ITabCompleteContext, ITabCompleteResult } from '../tab_complete';

/**
 * Runs a single named command in a particular runtime context.
 */
export interface ICommandRunner {
  get moduleName(): string;
  names(): string[];
  get packageName(): string;
  run(context: IRunContext): Promise<number>;

  /**
   * Optional tab completion.
   */
  tabComplete?(context: ITabCompleteContext): Promise<ITabCompleteResult>;
}
