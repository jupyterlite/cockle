import { BaseShell } from './base_shell';
import { IShell } from './defs';

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
    console.log('Cockle Shell.initWorker');
    return new Worker(new URL('./shell_worker.js', import.meta.url), { type: 'module' });
  }
}
