import { IStdinHandler, IStdinReply, IStdinRequest } from './buffered_io';
import { IShell } from './defs';
import { ServiceWorkerManager } from './service_worker_manager';
import { delay } from './utils';

/**
 * Shell manager that knows about all shells in a particular browser tab.
 * Routes service worker requests received in the UI thread to the correct shell.
 */
export class ShellManager {
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

  registerShell(shellId: string, shell: IShell, stdinHandler: IStdinHandler): void {
    if (shellId === '') {
      throw new Error('shellId not set');
    } else if (this._shells.has(shellId)) {
      throw new Error(`Duplicate shellId: ${shellId}`);
    }
    this._shells.set(shellId, stdinHandler);
    shell.disposed.connect(() => this._shells.delete(shellId));
  }

  shellIds(): string[] {
    return [...this._shells.keys()];
  }

  async stdinHandler(request: IStdinRequest): Promise<IStdinReply> {
    const { shellId } = request;
    const stdinHandler = this._shells.get(shellId);
    if (stdinHandler === undefined) {
      return { error: `Unrecognised shellId ${shellId}` };
    }
    return await stdinHandler(request);
  }

  private _shells = new Map<string, IStdinHandler>();
  private _serviceWorkerManager?: ServiceWorkerManager;
}
