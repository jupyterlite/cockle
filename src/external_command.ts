import { IExternalContext } from './context';

/**
 * Run an external command from the Shell.
 */
export interface IExternalCommand {
  (context: IExternalContext): Promise<number>;
}

export namespace IExternalCommand {
  export interface IOptions {
    name: string;
    command: IExternalCommand;
  }
}
