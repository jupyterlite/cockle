import { BaseShellWorker } from './base_shell_worker';
import type { IWorkerCallbacks } from './callback_internal';
import type { IShellWorker } from './defs_internal';
import type { IDriveFSOptions } from './drive_fs';

// Coincident worker as seen from BaseShell in main UI thread.
export interface ICoincidentShellWorker extends IShellWorker, IWorkerCallbacks {}

/**
 * Coincident shell worker that does not use a DriveFS.
 */
export class CoincidentShellWorker extends BaseShellWorker implements IShellWorker {
  /**
   * Initialize the DriveFS to mount an external file system.
   * Default implementation does nothing.
   */
  protected initDriveFS(options: IDriveFSOptions): void {}

  initProxy(proxy: ICoincidentShellWorker): void {
    proxy.exitCode = this.exitCode.bind(this);
    proxy.exitExternalCommand = this.exitExternalCommand.bind(this);
    proxy.externalInput = this.externalInput.bind(this);
    proxy.externalOutput = this.externalOutput.bind(this);
    proxy.externalSetTermios = this.externalSetTermios.bind(this);
    proxy.initialize = this.initialize.bind(this);
    proxy.input = this.input.bind(this);
    //proxy.registerCallbacks not needed, only called from this function.
    proxy.setSize = this.setSize.bind(this);
    proxy.start = this.start.bind(this);
    proxy.themeChange = this.themeChange.bind(this);

    this.registerCallbacks(
      proxy.callExternalCommand.bind(proxy),
      proxy.callExternalTabComplete.bind(proxy),
      proxy.downloadModuleCallback.bind(proxy),
      proxy.enableBufferedStdinCallback.bind(proxy),
      proxy.externalInputReturn.bind(proxy),
      proxy.outputCallback.bind(proxy),
      proxy.setMainIOCallback.bind(proxy),
      proxy.terminateCallback.bind(proxy),
      proxy.wasmUrlQueryParamsCallback!.bind(proxy)
    );
  }
}
