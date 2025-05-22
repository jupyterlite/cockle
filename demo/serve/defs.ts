import { IShellManager } from '@jupyterlite/cockle';

export namespace IDemo {
  export interface IOptions {
    baseUrl: string;
    browsingContextId: string;
    shellManager: IShellManager;
    targetDiv: HTMLElement;
  }
}
