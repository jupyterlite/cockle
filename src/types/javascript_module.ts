import { IJavaScriptContext } from '../context';

export interface IJavaScriptModule {
  run(context: IJavaScriptContext): Promise<number>;
}
