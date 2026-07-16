import { BaseShell } from './base_shell';
import type { IShell } from './defs';

/**
 * Shell class that communicates with ShellWorker.
 */
export class Shell extends BaseShell {
  /**
   * Instantiate a new Shell
   *
   * @param options The instantiation options for a new shell
   */
  constructor(readonly options: IShell.IOptions) {
    super(options);
  }

  /**
   * Load the web worker.
   */
  protected override initWorker(options: IShell.IOptions): Worker {
    const { workerType } = this;
    console.log(`Cockle Shell.initWorker ${workerType}`);
    if (workerType === 'coincident') {
      return new Worker(new URL('./coincident.worker.js', import.meta.url), { type: 'module' });
    } else {
      return new Worker(new URL('./comlink.worker.js', import.meta.url), { type: 'module' });
    }
  }
}
