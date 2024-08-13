/**
 * Loader of WASM modules. Once loaded, a module is cached so that it is faster to subsequently.
 * Must be run in a WebWorker.
 */
export class WasmLoader {
  constructor(wasmBaseUrl?: string) {
    this._wasmBaseUrl = wasmBaseUrl ?? '';
  }

  public getModule(name: string): any {
    let module = this._cache.get(name);
    if (module === undefined) {
      // Maybe should use @jupyterlab/coreutils.URLExt to combine URL components.
      const url = this._wasmBaseUrl + name + '.js';
      console.log('Importing JS/WASM from ' + url);
      importScripts(url);
      module = (self as any).Module;
      this._cache.set(name, module);
    }
    return module;
  }

  private _wasmBaseUrl: string;
  private _cache = new Map<string, any>();
}
