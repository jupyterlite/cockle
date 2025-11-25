import type { IJavaScriptRunContext, IJavaScriptTabCompleteContext } from '../context';
import type { ITabCompleteResult } from '../tab_complete';

export interface IJavaScriptModule {
  run(context: IJavaScriptRunContext): Promise<number>;
  tabComplete?(context: IJavaScriptTabCompleteContext): Promise<ITabCompleteResult>;
}
