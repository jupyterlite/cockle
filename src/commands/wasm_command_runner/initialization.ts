import type { Environment } from '../../environment';
import type { IFileSystem } from '../../file_system';
import { SharedFS } from '../../shared_fs';
import type { MainModule } from '../../types/wasm_module';

/**
 * Proxy the directories of the shared file system into the file system of the wasm command so
 * that the command and the shell use the same files, and set the permissions of the command's
 * own directories.
 */
export function initFileSystem(module: MainModule, fileSystem: IFileSystem): void {
  const { FS } = module;
  if (FS === undefined) {
    return;
  }

  const sharedFS = fileSystem.FS;
  const PROXYFS = module.PROXYFS ?? fileSystem.PROXYFS;

  // Proxy directories from shared file system into wasm command file system.
  const excluded = [...SharedFS.WASM_DIRECTORIES_NOT_SHARED, '/..', '/.'];
  const dirsToProxy = (sharedFS.readdir('/') as string[])
    .map(name => `/${name}`)
    .filter(name => !excluded.includes(name));
  dirsToProxy.forEach(dirToProxy => {
    try {
      if (FS.analyzePath(dirToProxy).exists) {
        FS.chmod(dirToProxy, SharedFS.TOP_LEVEL_DIRECTORY_PERMISSIONS);
      } else {
        FS.mkdir(dirToProxy, SharedFS.TOP_LEVEL_DIRECTORY_PERMISSIONS);
      }
      FS.mount(PROXYFS, { root: dirToProxy, fs: sharedFS }, dirToProxy);
    } catch (err: any) {
      console.error(`Failed to proxy directory ${dirToProxy}`);
    }
  });

  // Set permissions of wasm directories that are not proxied.
  SharedFS.WASM_DIRECTORIES_NOT_SHARED.forEach(dir => {
    try {
      FS.chmod(dir, SharedFS.TOP_LEVEL_DIRECTORY_PERMISSIONS);
    } catch (err: any) {
      console.error(`Failed to chmod ${dir}`);
    }
  });

  // Set permissions of root directory.
  try {
    FS.chmod('/', SharedFS.ROOT_DIRECTORY_PERMISSIONS);
  } catch (err: any) {
    console.error('Failed to chmod of root directory');
  }

  FS.chdir(sharedFS.cwd());
}

/**
 * Copy the shell environment variables into the wasm command.
 */
export function initEnvironment(module: MainModule, environment: Environment): void {
  if (module.ENV !== undefined) {
    environment.copyIntoCommand(module.ENV);
  }
}
