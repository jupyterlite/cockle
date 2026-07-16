import coincident from 'coincident/worker';
import type { ICoincidentShellWorker } from './coincident_shell_worker';
import { CoincidentShellWorker } from './coincident_shell_worker';

export const proxy = (await coincident()).proxy as ICoincidentShellWorker;
export const worker = new CoincidentShellWorker();
worker.initProxy(proxy);
