import { Context } from '../context';

export interface ICommandRunner {
  names(): string[];
  run(cmdName: string, context: Context): Promise<number>;
}
