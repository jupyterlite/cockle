import { IJavaScriptRunContext } from '../context';
import { ITabCompleteContext, ITabCompleteResult } from '../tab_complete';

export interface IJavaScriptModule {
  run(context: IJavaScriptRunContext): Promise<number>;
  tabComplete?(context: ITabCompleteContext): Promise<ITabCompleteResult>;
}
