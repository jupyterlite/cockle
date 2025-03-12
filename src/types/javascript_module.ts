import { IJavaScriptContext } from '../javascript_context';

export interface IJavaScriptModule {
  run(cmdName: string, context: IJavaScriptContext): Promise<number>;
}
