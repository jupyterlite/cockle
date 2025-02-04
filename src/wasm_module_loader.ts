import { WasmModuleCache } from './wasm_module_cache';
import { IShellWorker } from './defs_internal';

/**
 * Loader of WASM modules. Once loaded, a module is cached so that it is faster to subsequently.
 * Must be run in a WebWorker.
 */
export class WasmModuleLoader {
  constructor(
    readonly wasmBaseUrl: string,
    readonly downloadWasmModuleCallback: IShellWorker.IProxyDownloadWasmModuleCallback
  ) {}

  public getModule(packageName: string, moduleName: string): any {
    let module = this.cache.get(packageName, moduleName);
    if (module === undefined) {
      // Maybe should use @jupyterlab/coreutils.URLExt to combine URL components.
      const filename = this.cache.key(packageName, moduleName) + '.js';
      const url = this.wasmBaseUrl + filename;
      console.log('Importing JS/WASM from ' + url);

      this.downloadWasmModuleCallback(packageName, moduleName, true);
      importScripts(url);
      module = (self as any).Module;
      this.cache.set(packageName, moduleName, module);
      this.downloadWasmModuleCallback(packageName, moduleName, false);
    }
    return module;
  }

  cache = new WasmModuleCache();
}
