import coincident from 'coincident/main';
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
      const { Worker: patchedWorker } = coincident();
      const originalWorker = globalThis.Worker;
      globalThis.Worker = patchedWorker;
      const worker = new Worker(new URL('./coincident.worker.js', import.meta.url), {
        type: 'module'
      });
      globalThis.Worker = originalWorker;
      return worker;
    } else {
      console.log('Cockle Shell.initWorker comlink');
      return new Worker(new URL('./comlink.worker.js', import.meta.url), { type: 'module' });
    }
  }
}
