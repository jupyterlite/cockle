import { IJavaScriptContext } from '../context';
import { ITabCompleteContext, ITabCompleteResult } from '../tab_complete';

export interface IJavaScriptModule {
  run(context: IJavaScriptContext): Promise<number>;
  tabComplete?(context: ITabCompleteContext): Promise<ITabCompleteResult>;
}
