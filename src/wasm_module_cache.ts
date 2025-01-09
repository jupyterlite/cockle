export class WasmModuleCache {
  get(moduleName: string): any {
    return this._cache.get(moduleName) ?? undefined;
  }

  has(moduleName: string): boolean {
    return this._cache.has(moduleName);
  }

  set(moduleName: string, module: any): void {
    this._cache.set(moduleName, module);
  }

  private _cache = new Map<string, any>();
}
