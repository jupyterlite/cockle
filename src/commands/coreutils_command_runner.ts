import { WasmCommandRunner } from './wasm_command_runner';
import { WasmLoader } from '../wasm_loader';

export class CoreutilsCommandRunner extends WasmCommandRunner {
  constructor(wasmLoader: WasmLoader) {
    super(wasmLoader);
  }

  moduleName(): string {
    return 'coreutils';
  }

  names(): string[] {
    return [
      'basename',
      'cat',
      'chmod',
      'cp',
      'cut',
      'date',
      'dir',
      'dircolors',
      'dirname',
      'echo',
      'env',
      'expr',
      'head',
      'id',
      'join',
      'ln',
      'logname',
      'ls',
      'md5sum',
      'mkdir',
      'mv',
      'nl',
      'pwd',
      'realpath',
      'rm',
      'rmdir',
      'seq',
      'sha1sum',
      'sha224sum',
      'sha256sum',
      'sha384sum',
      'sha512sum',
      'sleep',
      'sort',
      'stat',
      'stty',
      'tail',
      'touch',
      'tr',
      'tty',
      'uname',
      'uniq',
      'vdir',
      'wc'
    ];
  }
}
