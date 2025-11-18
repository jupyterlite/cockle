import { IMainIO, IStdinReply, IStdinRequest } from './defs';
import { MainIO } from './main_io';
import { ServiceWorkerUtils } from './service_worker_utils';

export class ServiceWorkerMainIO extends MainIO implements IMainIO {
  constructor(baseUrl: string, browsingContextId: string, shellId: string) {
    super();
    this._utils = new ServiceWorkerUtils(baseUrl, browsingContextId, shellId);
  }

  async handleStdin(request: IStdinRequest): Promise<IStdinReply> {
    if (!this._enabled) {
      throw new Error('ServiceWorkerMainIO.handleStdin when disabled');
    }

    const { test, timeoutMs } = request;

    if (test) {
      return { text: 'ok:' + request.shellId };
    }

    const text = await this._handleStdinImpl(timeoutMs);
    return { text };
  }

  async testWithTimeout(timeoutMs: number): Promise<boolean> {
    if (!this._enabled) {
      throw new Error('ServiceWorkerMainIO.testWithTimeout when disabled');
    }

    const testPromise = this._utils.getStdinAsync(-1, true);
    const timeoutPromise = new Promise<null>(resolve => {
      return setTimeout(() => resolve(null), timeoutMs);
    });

    const text = await Promise.race([testPromise, timeoutPromise]);
    if (text === null) {
      console.warn('Timeout accessing service worker');
      return false;
    } else if (text !== 'ok:' + this._utils.shellId) {
      console.warn('Error accessing service worker');
      return false;
    }
    return true;
  }

  private _utils: ServiceWorkerUtils;
}
