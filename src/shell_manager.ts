import { IHandleStdin, IStdinReply, IStdinRequest } from './buffered_io';
import { IShell, IShellManager } from './defs';
import { ServiceWorkerManager } from './service_worker_manager';
import { delay } from './utils';

/**
 * Shell manager that knows about all shells in a particular browser tab.
 * Routes service worker requests received in the UI thread to the correct shell.
 *
 * To enable use of service worker for stdin for a Shell, first create a ShellManager and pass both
 * it and the browsingContextId to the Shell constructor, which will perform the necessary
 * registration.
 */
export class ShellManager implements IShellManager {
  async handleStdin(request: IStdinRequest): Promise<IStdinReply> {
    const { shellId } = request;
    const shellHandleStdin = this._shells.get(shellId);
    if (shellHandleStdin === undefined) {
      return { error: `Unrecognised shellId ${shellId}` };
    }
    return await shellHandleStdin(request);
  }

  async installServiceWorker(baseUrl: string): Promise<string> {
    if (this._serviceWorkerManager === undefined) {
      this._serviceWorkerManager = new ServiceWorkerManager(baseUrl, this);
      await this._serviceWorkerManager.ready;

      // Short delay to ensure ServiceWorker is available.
      await delay(100);

      return this._serviceWorkerManager.browsingContextId;
    } else {
      console.warn('Service Worker already installed');
      return this._serviceWorkerManager.browsingContextId;
    }
  }

  registerShell(shellId: string, shell: IShell, handleStdin: IHandleStdin): void {
    if (shellId === '') {
      throw new Error('shellId not set');
    } else if (this._shells.has(shellId)) {
      throw new Error(`Duplicate shellId: ${shellId}`);
    }
    this._shells.set(shellId, handleStdin);
    shell.disposed.connect(() => this._shells.delete(shellId));
  }

  shellIds(): string[] {
    return [...this._shells.keys()];
  }

  private _shells = new Map<string, IHandleStdin>();
  private _serviceWorkerManager?: ServiceWorkerManager;
}
