import { CommandModuleCache } from './command_module_cache';
import { IShellWorker } from '../defs_internal';
import { default as EmscriptenModuleFactory } from '../fs';

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

  /**
   * Load the specified WebAssembly module.
   * If loading fails return undefined, and caller is responsible for reporting this to the user if
   * appropriate.
   */
  public getModule(
    packageName: string,
    moduleName: string
  ): typeof EmscriptenModuleFactory | undefined {
    let module = this.cache.get(packageName, moduleName);
    if (module === undefined) {
      // Maybe should use @jupyterlab/coreutils.URLExt to combine URL components.
      const filename = this.cache.key(packageName, moduleName) + '.js';
      const url = this.wasmBaseUrl + filename;
      console.log('Cockle importing JavaScript/WebAssembly from ' + url);

      this.downloadModuleCallback(packageName, moduleName, true);
      try {
        importScripts(url);
        module = (self as any).Module as typeof EmscriptenModuleFactory;
      } finally {
        this.downloadModuleCallback(packageName, moduleName, false);
      }

      if (module !== undefined) {
        this.cache.set(packageName, moduleName, module);
      }
    }
    return module;
  }

  cache = new CommandModuleCache();
}
