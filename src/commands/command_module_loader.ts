import { CommandModuleCache } from './command_module_cache';
import { IShellWorker } from '../defs_internal';

/**
 * Loader of JavaScript/WASM modules. Once loaded, a module is cached so that it is faster to
 * subsequently.
 * Must be run in a WebWorker.
 */
export class CommandModuleLoader {
  constructor(
    readonly wasmBaseUrl: string,
    readonly downloadModuleCallback: IShellWorker.IProxyDownloadModuleCallback
  ) {}

  public getModule(packageName: string, moduleName: string): any {
    let module = this.cache.get(packageName, moduleName);
    if (module === undefined) {
      // Maybe should use @jupyterlab/coreutils.URLExt to combine URL components.
      const filename = this.cache.key(packageName, moduleName) + '.js';
      const url = this.wasmBaseUrl + filename;
      console.log('Cockle importing JavaScript/WebAssembly from ' + url);

      this.downloadModuleCallback(packageName, moduleName, true);
      importScripts(url);
      module = (self as any).Module;
      this.cache.set(packageName, moduleName, module);
      this.downloadModuleCallback(packageName, moduleName, false);
    }
    return module;
  }

  cache = new CommandModuleCache();
}
