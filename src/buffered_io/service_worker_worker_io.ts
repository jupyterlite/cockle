import type { IPosixSignalHandler, IWorkerIO, StdinResult } from './defs';
import { ServiceWorkerUtils } from './service_worker_utils';
import { WorkerIO } from './worker_io';
import type { IOutputCallback } from '../callback';
import type { Termios } from '../termios';

export class ServiceWorkerWorkerIO extends WorkerIO implements IWorkerIO {
  constructor(
    outputCallback: IOutputCallback,
    posixSignalHandler: IPosixSignalHandler,
    termios: Termios.Termios,
    baseUrl: string,
    browsingContextId: string,
    shellId: string
  ) {
    super(outputCallback, posixSignalHandler, termios);
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
