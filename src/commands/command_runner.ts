import { IContext } from '../context';

/**
 * Runs a single named command in a particular runtime context.
 */
export interface ICommandRunner {
  get moduleName(): string;
  names(): string[];
  get packageName(): string;
  run(cmdName: string, context: IContext): Promise<number>;
}
