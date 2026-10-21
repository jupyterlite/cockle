import type { CommandModuleLoader } from '../commands';
import { CommandModule, CommandPackage } from '../commands';
import type { IRunContext } from '../context';
import type { IShellImpl } from '../defs_internal';
import { DEFAULT_USER } from '../environment';
import { SharedFS } from '../shared_fs';
import { joinURL } from '../utils';


export interface IInitOptions {
  commandModuleLoader: CommandModuleLoader;
  shellImplOptions: IShellImpl.IOptions;
  runContext: IRunContext;
  wasmUrlQueryParams: (filename: string) => Promise<string>;
}

export async function initFileSystem(initOptions: IInitOptions): Promise<void> {
  const { runContext, shellImplOptions, commandModuleLoader } = initOptions;
  const { user, wasmBaseUrl } = shellImplOptions;
  const fsModule = await commandModuleLoader.getWasmModule('cockle_fs', 'fs');
  if (fsModule === undefined) {
    // Cannot report this in the terminal as it has not been started yet.
    // TODO: Store this information and report it when the terminal is up and running?
    console.error('Unable to load cockle_fs, shell cannot function');
    return;
  }
  const module = await fsModule({
    locateFile: (path: string) => joinURL(wasmBaseUrl, 'cockle_fs/' + path)
  });
  const { FS, PATH, ERRNO_CODES, PROXYFS } = module;

  runContext.fileSystem.FS = FS;
  runContext.fileSystem.PATH = PATH;
  runContext.fileSystem.ERRNO_CODES = ERRNO_CODES;
  runContext.fileSystem.PROXYFS = PROXYFS;

  // Home directory.
  if (user !== undefined && user !== DEFAULT_USER) {
    const oldDir = `/home/${DEFAULT_USER}`;
    const newDir = `/home/${user}`;
    try {
      FS.rename(oldDir, newDir);
    } catch (err: any) {
      console.error(`Failed to rename home directory from ${oldDir} to ${newDir}`);
    }
  }

  // Create new directories.
  SharedFS.NON_WASM_DIRECTORIES_SHARED.forEach(dir => {
    try {
      FS.mkdir(dir, SharedFS.TOP_LEVEL_DIRECTORY_PERMISSIONS);
    } catch (err: any) {
      console.error(`Failed to create directory ${dir}`);
    }
  });

  const mountpoint = runContext.fileSystem.mountpoint;
  try {
    FS.mkdirTree(mountpoint, SharedFS.TOP_LEVEL_DIRECTORY_PERMISSIONS);
  } catch (err: any) {
    console.error(`Failed to create mountpoint directory ${mountpoint}`);
  }

  // Set permissions of directories that are created in wasm module.
  SharedFS.ALL_WASM_DIRECTORIES.forEach(dir => {
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

  const { browsingContextId, baseUrl, initialDirectories, initialFiles } = shellImplOptions;
  await shellImplOptions.initDriveFSCallback({
    browsingContextId,
    baseUrl,
    fileSystem: runContext.fileSystem,
    mountpoint
  });

  FS.chdir(mountpoint);

  if (initialDirectories) {
    initialDirectories.forEach((directory: string) => FS.mkdir(directory, 0o775));
  }

  if (initialFiles) {
    Object.entries(initialFiles).forEach(([filename, contents]) =>
      FS.writeFile(filename, contents, { mode: 0o664 })
    );
  }

  if (shellImplOptions.cwd !== undefined) {
    try {
      FS.chdir(shellImplOptions.cwd);
    } catch (err: any) {
      // Remains in mountpoint.
      console.error('Failed to cd to ' + shellImplOptions.cwd);
    }
  }

  runContext.environment.set('PWD', FS.cwd());
}

export async function initWasmPackages(initOptions: IInitOptions): Promise<void> {
  const { runContext, shellImplOptions, commandModuleLoader, wasmUrlQueryParams } = initOptions;
  const filename = 'cockle-config.json';
  const queryParams = await wasmUrlQueryParams(filename);
  const url = joinURL(shellImplOptions.wasmBaseUrl, filename + queryParams);
  const response = await fetch(url);
  if (!response.ok) {
    // Would be nice to report this via the terminal.
    console.error(`Failed to fetch ${url}, terminal cannot function without it`);
  }

  const cockleConfig = await response.json();
  // Check JSON follows schema?
  // May want to store JSON config.

  const packageNames = Object.keys(cockleConfig.packages);
  const fsPackage = 'cockle_fs';
  if (!packageNames.includes(fsPackage)) {
    console.error(`cockle-config.json does not include required package '${fsPackage}'`);
  }

  // Create command runners for each wasm module of each emscripten-forge package.
  for (const packageName of packageNames) {
    const pkgConfig = cockleConfig.packages[packageName]; // Not type safe
    const commandModules = Object.entries(pkgConfig.modules).map(
      ([moduleName, moduleConfig]) =>
        new CommandModule(
          commandModuleLoader,
          moduleName,
          (moduleConfig as any).commands ? (moduleConfig as any).commands.split(',') : [],
          packageName,
          pkgConfig.wasm
        )
    );
    const commandPackage = new CommandPackage(
      packageName,
      pkgConfig.version,
      pkgConfig.build_string,
      pkgConfig.channel,
      pkgConfig.platform,
      pkgConfig.wasm,
      commandModules
    );
    runContext.commandRegistry.registerCommandPackage(commandPackage);
  }

  // Initialise aliases.
  if (Object.hasOwn(cockleConfig, 'aliases')) {
    for (const [key, v] of Object.entries(cockleConfig.aliases)) {
      const value = v as string;
      if (value.length > 0) {
        runContext.aliases.set(key, value);
      }
    }
  }

  // Initialise environment variables.
  if (Object.hasOwn(cockleConfig, 'environment')) {
    for (const [key, v] of Object.entries(cockleConfig.environment)) {
      const value = v as string;
      if (value.length > 0) {
        runContext.environment.set(key, value);
      }
    }
  }
}
