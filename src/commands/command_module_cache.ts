import type { default as EmscriptenModuleFactory } from '../fs';

export class CommandModuleCache {
  get(packageName: string, moduleName: string): typeof EmscriptenModuleFactory | undefined {
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

  set(packageName: string, moduleName: string, module: typeof EmscriptenModuleFactory): void {
    const key = this.key(packageName, moduleName);
    this._cache.set(key, module);
  }

  private _cache = new Map<string, typeof EmscriptenModuleFactory>();
}
