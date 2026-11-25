import type { IPosixSignalHandler, IWorkerIO, StdinResult } from './defs';
import { ServiceWorkerUtils } from './service_worker_utils';
import { WorkerIO } from './worker_io';
import type { IWorkerOutputCallback } from '../callback_internal';

export class ServiceWorkerWorkerIO extends WorkerIO implements IWorkerIO {
  constructor(
    outputCallback: IWorkerOutputCallback,
    posixSignalHandler: IPosixSignalHandler,
    baseUrl: string,
    browsingContextId: string,
    shellId: string
  ) {
    super(outputCallback, posixSignalHandler);
    this._utils = new ServiceWorkerUtils(baseUrl, browsingContextId, shellId);
  }

  protected _getStdin(timeoutMs: number): StdinResult {
    return this._utils.getStdin(timeoutMs);
  }

  protected async _getStdinAsync(timeoutMs: number): Promise<StdinResult> {
    return this._utils.getStdinAsync(timeoutMs);
  }

  private _utils: ServiceWorkerUtils;
}
