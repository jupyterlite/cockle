import { IJavaScriptContext } from '../context';

export interface IJavaScriptModule {
  run(cmdName: string, context: IJavaScriptContext): Promise<number>;
}
