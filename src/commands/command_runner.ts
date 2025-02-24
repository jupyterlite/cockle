import { IContext } from '../context';

/**
 * Runs a single named command in a particular runtime context.
 */
export interface ICommandRunner {
  names(): string[];
  run(cmdName: string, context: IContext): Promise<number>;
}
