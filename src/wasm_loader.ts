/**
 * Loader of WASM modules. Once loaded, a module is cached so that it is faster to subsequently.
 * Must be run in a WebWorker.
 */
export class WasmLoader {
  constructor(readonly wasmBaseUrl: string) {}

  public getModule(name: string): any {
    let module = this._cache.get(name);
    if (module === undefined) {
      // Maybe should use @jupyterlab/coreutils.URLExt to combine URL components.
      const url = this.wasmBaseUrl + name + '.js';
      console.log('Importing JS/WASM from ' + url);
      importScripts(url);
      module = (self as any).Module;
      this._cache.set(name, module);
    }
    return module;
  }

  private _cache = new Map<string, any>();
}
