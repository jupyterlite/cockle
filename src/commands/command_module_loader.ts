import { CommandModuleCache } from './command_module_cache';
import { IShellWorker } from '../defs_internal';
import { IWebAssemblyModule } from '../types/fs';
import { IJavaScriptModule } from '../types/javascript_module';

/**
 * Loader of JavaScript/WebAssembly modules. Once loaded, a module is cached so that it is faster
 * to subsequently.
 * Must be run in a WebWorker.
 */
export class CommandModuleLoader {
  constructor(
    readonly wasmBaseUrl: string,
    readonly downloadModuleCallback: IShellWorker.IProxyDownloadModuleCallback
  ) {}

  /**
   * Load the specified JavaScript command module.
   * If loading fails return undefined, and caller is responsible for reporting this to the user if
   * appropriate.
   */
  public getJavaScriptModule(
    packageName: string,
    moduleName: string
  ): IJavaScriptModule | undefined {
    const module = this._getModule(packageName, moduleName, false);
    return module !== undefined ? (module as IJavaScriptModule) : undefined;
  }

  /**
   * Load the specified WebAssembly command module.
   * If loading fails return undefined, and caller is responsible for reporting this to the user if
   * appropriate.
   */
  public getWasmModule(packageName: string, moduleName: string): IWebAssemblyModule | undefined {
    const module = this._getModule(packageName, moduleName, true);
    return module !== undefined ? (module as IWebAssemblyModule) : undefined;
  }

  private _getModule(packageName: string, moduleName: string, wasm: boolean): any {
    let module = this.cache.get(packageName, moduleName);
    if (module === undefined) {
      // Maybe should use @jupyterlab/coreutils.URLExt to combine URL components.
      const filename = this.cache.key(packageName, moduleName) + '.js';
      const url = this.wasmBaseUrl + filename;
      console.log(`Cockle loading ${wasm ? 'WebAssembly' : 'JavaScript'} module from ${url}`);

      this.downloadModuleCallback(packageName, moduleName, true);
      try {
        importScripts(url);
        module = (self as any).Module;
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
