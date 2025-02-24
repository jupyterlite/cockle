import { IContext } from '../context';

export interface ICommandRunner {
  names(): string[];
  run(cmdName: string, context: IContext): Promise<number>;
}
