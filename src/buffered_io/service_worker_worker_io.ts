import { IWorkerIO } from './defs';
import { ServiceWorkerUtils } from './service_worker_utils';
import { WorkerIO } from './worker_io';
import { IOutputCallback } from '../callback';
import { Termios } from '../termios';

export class ServiceWorkerWorkerIO extends WorkerIO implements IWorkerIO {
  constructor(
    outputCallback: IOutputCallback,
    termios: Termios.Termios,
    baseUrl: string,
    browsingContextId: string,
    shellId: string
  ) {
    super(outputCallback, termios);
    this._utils = new ServiceWorkerUtils(baseUrl, browsingContextId, shellId);
  }

  protected _getStdin(timeoutMs: number): string {
    return this._utils.getStdin(timeoutMs);
  }

  protected async _getStdinAsync(timeoutMs: number): Promise<string> {
    return this._utils.getStdinAsync(timeoutMs);
  }

  private _utils: ServiceWorkerUtils;
}
