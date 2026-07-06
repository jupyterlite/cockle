import { CommandModuleCache } from './command_module_cache';
import type { IDownloadModuleCallback } from '../callback_internal';
import type { IJavaScriptModule } from '../types/javascript_module';
import type { IWebAssemblyModule } from '../types/wasm_module';
import { joinURL } from '../utils';

/**
 * Loader of JavaScript/WebAssembly modules. Once loaded, a module is cached so that it is faster
 * to subsequently.
 * Must be run in a WebWorker.
 */
export class CommandModuleLoader {
  constructor(
    readonly wasmBaseUrl: string,
    readonly wasmUrlQueryParamsCallback: (filename: string) => Promise<string>,
    readonly downloadModuleCallback: IDownloadModuleCallback
  ) {}

  /**
   * Load the specified JavaScript command module.
   * If loading fails return undefined, and caller is responsible for reporting this to the user if
   * appropriate.
   */
  public async getJavaScriptModule(
    packageName: string,
    moduleName: string
  ): Promise<IJavaScriptModule | undefined> {
    const module = await this._getModule(packageName, moduleName, false);
    return module !== undefined ? (module as IJavaScriptModule) : undefined;
  }

  /**
   * Load the specified WebAssembly command module.
   * If loading fails return undefined, and caller is responsible for reporting this to the user if
   * appropriate.
   */
  public async getWasmModule(
    packageName: string,
    moduleName: string
  ): Promise<IWebAssemblyModule | undefined> {
    const module = await this._getModule(packageName, moduleName, true);
    return module !== undefined ? (module as IWebAssemblyModule) : undefined;
  }

  private async _getModule(packageName: string, moduleName: string, wasm: boolean): Promise<any> {
    let module = this.cache.get(packageName, moduleName);
    if (module === undefined) {
      // Maybe should use @jupyterlab/coreutils.URLExt to combine URL components.
      const filename = this.cache.key(packageName, moduleName) + '.js';
      const queryParams = await this.wasmUrlQueryParamsCallback(filename);
      const url = joinURL(this.wasmBaseUrl, filename + queryParams);

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
