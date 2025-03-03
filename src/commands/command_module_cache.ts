import { default as EmscriptenModuleFactory } from '../types/fs';
import { JavaScriptModule } from '../types/javascript_module';

type CacheItem = typeof EmscriptenModuleFactory | JavaScriptModule;

/**
 * Cache for command modules so that each only has to be downloaded once.
 * A module can either be a `JavaScriptModule` or a `typeof EmscriptenModuleFactory`.
 * Here they are typed as `any` and the `CommandModuleLoader` deals with the specific types.
 */
export class CommandModuleCache {
  get(packageName: string, moduleName: string): CacheItem | undefined {
    const key = this.key(packageName, moduleName);
    return this._cache.get(key) ?? undefined;
  }

  has(packageName: string, moduleName: string): boolean {
    const key = this.key(packageName, moduleName);
    return this._cache.has(key);
  }

  key(packageName: string, moduleName: string): string {
    return [packageName, moduleName].join('/');
  }

  set(packageName: string, moduleName: string, module: CacheItem): void {
    const key = this.key(packageName, moduleName);
    this._cache.set(key, module);
  }

  private _cache = new Map<string, CacheItem>();
}
