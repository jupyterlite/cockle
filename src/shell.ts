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
    if (this.workerType === 'coincident') {
      console.log('Cockle Shell.initWorker coincident');
      return new Worker(new URL('./coincident.worker.js', import.meta.url), { type: 'module' });
    } else {
      console.log('Cockle Shell.initWorker comlink');
      return new Worker(new URL('./comlink.worker.js', import.meta.url), { type: 'module' });
    }
  }
}
