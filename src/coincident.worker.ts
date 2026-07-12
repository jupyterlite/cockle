import coincident from 'coincident';
import type { ICoincidentShellWorker } from './coincident_shell_worker';
import { CoincidentShellWorker } from './coincident_shell_worker';

export const proxy = coincident(self) as ICoincidentShellWorker;
export const worker = new CoincidentShellWorker();
worker.initProxy(proxy);
