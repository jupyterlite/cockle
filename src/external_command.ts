import type { IExternalRunContext, IExternalTabCompleteContext } from './context';
import type { ITabCompleteResult } from './tab_complete';

/**
 * Run an external command from the Shell.
 */
export interface IExternalCommand {
  (context: IExternalRunContext): Promise<number>;
}

/**
 * Tab complete an external command from the Shell.
 */
export interface IExternalTabComplete {
  (context: IExternalTabCompleteContext): Promise<IExternalTabCompleteResult>;
}

export interface IExternalTabCompleteResult extends ITabCompleteResult {}

export namespace IExternalCommand {
  export interface IOptions {
    name: string;
    command: IExternalCommand;
    tabComplete?: IExternalTabComplete;
  }
}
