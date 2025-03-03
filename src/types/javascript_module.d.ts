import { IContext } from '../context';

export interface JavaScriptModule {
  run(cmdName: string, context: IContext): Promise<number>;
}
