import { expose } from 'comlink';
import { ComlinkShellWorker } from './comlink_shell_worker';

const worker = new ComlinkShellWorker();
expose(worker);
