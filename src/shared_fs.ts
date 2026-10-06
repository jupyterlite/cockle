/**
 * Information relating to file system shared between `cockle_fs` and WebAssembly commands.
 */
export namespace SharedFS {
  /**
   * Top-level directories created automatically in wasm modules that we either want to share or not
   * share between wasm commands.
   */
  export const WASM_DIRECTORIES_NOT_SHARED: readonly string[] = ['/dev', '/proc'];
  export const WASM_DIRECTORIES_SHARED: readonly string[] = ['/home', '/tmp'];
  export const ALL_WASM_DIRECTORIES: readonly string[] = [
    ...WASM_DIRECTORIES_NOT_SHARED,
    ...WASM_DIRECTORIES_SHARED
  ];

  /**
   * Top-level directories not created in wasm modules that we want to create and share between
   * commands.
   * Would like to include `/etc` and `/usr` but these are used by .data files (in commands `less`,
   * `nano` and `vim`) so exclude them until we have a system for sharing data files from packages
   * (such as `ncurses`) between commands.
   */
  export const NON_WASM_DIRECTORIES_SHARED: readonly string[] = ['/include', '/lib', '/share'];

  /**
   * Root directory permissions that ensure the user cannot create new top-level directories.
   */
  export const ROOT_DIRECTORY_PERMISSIONS = 0o550;

  /**
   * Top-level directory permissions.
   */
  export const TOP_LEVEL_DIRECTORY_PERMISSIONS = 0o770;
}
