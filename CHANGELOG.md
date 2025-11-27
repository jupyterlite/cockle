# Changelog

<!-- <START NEW CHANGELOG ENTRY> -->

## 1.3.0

Cockle 1.3.0 adds support for getting the current terminal size from external and javascript commands, and adds `IOutput.isTerminal` to check if writing to a terminal or not. There is also a fix for a significant bug handling timeouts using the service worker for stdin when running interactive commands such as `vim`.

([Full Changelog](https://github.com/jupyterlite/cockle/compare/v1.2.0...5a3026d6f81d81fef113b5cd8aecd143ad4ba757))

### Enhancements made

- Support getting current window size from external and javascript commands [#265](https://github.com/jupyterlite/cockle/pull/265) ([@ianthomas23](https://github.com/ianthomas23))
- Support version restrictions for wasm command packages [#260](https://github.com/jupyterlite/cockle/pull/260) ([@ianthomas23](https://github.com/ianthomas23))
- Add `IOutput.isTerminal()` function [#258](https://github.com/jupyterlite/cockle/pull/258) ([@ianthomas23](https://github.com/ianthomas23))
- Combine boolean argument short names [#257](https://github.com/jupyterlite/cockle/pull/257) ([@ianthomas23](https://github.com/ianthomas23))
- Validate length of argument short and long names [#256](https://github.com/jupyterlite/cockle/pull/256) ([@ianthomas23](https://github.com/ianthomas23))

### Bugs fixed

- Fix newline at top of terminal after clear command [#268](https://github.com/jupyterlite/cockle/pull/268) ([@ianthomas23](https://github.com/ianthomas23))
- Don't update env at end of wasm command [#267](https://github.com/jupyterlite/cockle/pull/267) ([@ianthomas23](https://github.com/ianthomas23))
- Correctly handle infinite poll timeout in service worker IO [#263](https://github.com/jupyterlite/cockle/pull/263) ([@ianthomas23](https://github.com/ianthomas23))

### Maintenance and upkeep improvements

- Enforce type imports [#266](https://github.com/jupyterlite/cockle/pull/266) ([@ianthomas23](https://github.com/ianthomas23))
- Refactor SharedArrayBuffer stdin [#264](https://github.com/jupyterlite/cockle/pull/264) ([@ianthomas23](https://github.com/ianthomas23))
- Correctly setup tests for stdin via service worker [#262](https://github.com/jupyterlite/cockle/pull/262) ([@ianthomas23](https://github.com/ianthomas23))
- Remove unneeded .nojekyll file [#259](https://github.com/jupyterlite/cockle/pull/259) ([@ianthomas23](https://github.com/ianthomas23))

### Contributors to this release

([GitHub contributors page for this release](https://github.com/jupyterlite/cockle/graphs/contributors?from=2025-10-15&to=2025-11-27&type=c))

[@ianthomas23](https://github.com/search?q=repo%3Ajupyterlite%2Fcockle+involves%3Aianthomas23+updated%3A2025-10-15..2025-11-27&type=Issues)

<!-- <END NEW CHANGELOG ENTRY> -->

## 1.2.0

Cockle 1.2.0 is a minor release adding support for changing termios settings in external commands (running in main UI thread) and javascript commands (running in cockle WebWorker), some improvements to tab completion using `Argument` classes, and a new environment variables `COCKLE_DARK_MODE` so that external/javascript commands can use colours based on whether the attached terminal is in dark or light mode.

([Full Changelog](https://github.com/jupyterlite/cockle/compare/v1.1.0...2795c7e57ecd59220bf6065f63efcfea6c138a75))

### Enhancements made

- Support changing termios settings in TypeScript external commands [#254](https://github.com/jupyterlite/cockle/pull/254) ([@ianthomas23](https://github.com/ianthomas23))
- Support changing termios settings in JavaScript commands [#253](https://github.com/jupyterlite/cockle/pull/253) ([@ianthomas23](https://github.com/ianthomas23))
- Allow `PositionalArguments` to return `pathType` as well as possible matches [#252](https://github.com/jupyterlite/cockle/pull/252) ([@ianthomas23](https://github.com/ianthomas23))
- Add `shellId` to all run and tab complete `Context` classes [#251](https://github.com/jupyterlite/cockle/pull/251) ([@ianthomas23](https://github.com/ianthomas23))
- Use env var COCKLE_DARK_MODE to record if dark mode or not [#250](https://github.com/jupyterlite/cockle/pull/250) ([@ianthomas23](https://github.com/ianthomas23))
- Account for previous flags in tab completion possibles callback [#249](https://github.com/jupyterlite/cockle/pull/249) ([@ianthomas23](https://github.com/ianthomas23))

### Bugs fixed

- Correct handling of multiple adjacent newlines [#255](https://github.com/jupyterlite/cockle/pull/255) ([@ianthomas23](https://github.com/ianthomas23))

### Contributors to this release

([GitHub contributors page for this release](https://github.com/jupyterlite/cockle/graphs/contributors?from=2025-09-25&to=2025-10-15&type=c))

[@ianthomas23](https://github.com/search?q=repo%3Ajupyterlite%2Fcockle+involves%3Aianthomas23+updated%3A2025-09-25..2025-10-15&type=Issues)

## 1.1.0

Cockle 1.1.0 adds enhancements to the `cockle-config` command, help for built-in commands, and tab completion, and fixes a bug in filename tab completion. `git2cpp` has been added to the test suite and demo deployment as it has started to become useful; further enhancements to `git2cpp` will follow.

([Full Changelog](https://github.com/jupyterlite/cockle/compare/v1.0.0...545a3c1515fa7970b92b9e5acd54e9e0e3b59def))

### Enhancements made

- Add `git2cpp` to demo and tests [#246](https://github.com/jupyterlite/cockle/pull/246) ([@ianthomas23](https://github.com/ianthomas23))
- Support tab completion of the last of multiple commands [#245](https://github.com/jupyterlite/cockle/pull/245) ([@ianthomas23](https://github.com/ianthomas23))
- Support filtering by command type in `cockle-config command` [#244](https://github.com/jupyterlite/cockle/pull/244) ([@ianthomas23](https://github.com/ianthomas23))
- Show both short and long name options for builtin command help [#243](https://github.com/jupyterlite/cockle/pull/243) ([@ianthomas23](https://github.com/ianthomas23))
- Make PositionalArguments.possibles async [#242](https://github.com/jupyterlite/cockle/pull/242) ([@ianthomas23](https://github.com/ianthomas23))

### Bugs fixed

- Fix tab complete at dot in filename [#248](https://github.com/jupyterlite/cockle/pull/248) ([@ianthomas23](https://github.com/ianthomas23))

### Contributors to this release

([GitHub contributors page for this release](https://github.com/jupyterlite/cockle/graphs/contributors?from=2025-08-11&to=2025-09-25&type=c))

[@ianthomas23](https://github.com/search?q=repo%3Ajupyterlite%2Fcockle+involves%3Aianthomas23+updated%3A2025-08-11..2025-09-25&type=Issues)

## 1.0.0

This is a major release introducing support for tab completion in built-in, external and javascript commands via `CommandArguments` classes. There are also new built-in commands `false`, `true`, `help` and `which`.

The changes in external commands, command contexts and command argument classes are backwards incompatible, hence the major version bump.

Thanks to new contributors @martinRenou and @nakul-py.

([Full Changelog](https://github.com/jupyterlite/cockle/compare/v0.1.3...6604492ecb2f804b3ccb5b6360dc12def6f68c24))

### Enhancements made

- Support pasting of multiple characters to the command line [#240](https://github.com/jupyterlite/cockle/pull/240) ([@ianthomas23](https://github.com/ianthomas23))
- Use `Arguments.tabComplete` for builtin commands [#238](https://github.com/jupyterlite/cockle/pull/238) ([@ianthomas23](https://github.com/ianthomas23))
- Expose `IShell.exitCode()` and use in exit code tests [#237](https://github.com/jupyterlite/cockle/pull/237) ([@ianthomas23](https://github.com/ianthomas23))
- Adding `help` for builtin commands [#236](https://github.com/jupyterlite/cockle/pull/236) ([@nakul-py](https://github.com/nakul-py))
- Rename `IExternalContext` as `IExternalRunContext` [#233](https://github.com/jupyterlite/cockle/pull/233) ([@ianthomas23](https://github.com/ianthomas23))
- Pass optional dark/light mode boolean to `IShell.themeChange` [#232](https://github.com/jupyterlite/cockle/pull/232) ([@ianthomas23](https://github.com/ianthomas23))
- Rename `Options` classes to `Arguments` [#231](https://github.com/jupyterlite/cockle/pull/231) ([@ianthomas23](https://github.com/ianthomas23))
- Implement `true` and `false` commands [#229](https://github.com/jupyterlite/cockle/pull/229) ([@martinRenou](https://github.com/martinRenou))
- Implement `which` command [#228](https://github.com/jupyterlite/cockle/pull/228) ([@martinRenou](https://github.com/martinRenou))
- Add tab completion for external commands [#227](https://github.com/jupyterlite/cockle/pull/227) ([@ianthomas23](https://github.com/ianthomas23))
- Add tab completion via `Options` classes in `JavaScriptCommands` [#226](https://github.com/jupyterlite/cockle/pull/226) ([@ianthomas23](https://github.com/ianthomas23))

### Bugs fixed

- Fix display of help for some builtin commands [#235](https://github.com/jupyterlite/cockle/pull/235) ([@ianthomas23](https://github.com/ianthomas23))

### Maintenance and upkeep improvements

- Update `demo.png` for 1.0.0 release [#241](https://github.com/jupyterlite/cockle/pull/241) ([@ianthomas23](https://github.com/ianthomas23))
- Sort imports and add `src/commands/index.ts` [#239](https://github.com/jupyterlite/cockle/pull/239) ([@ianthomas23](https://github.com/ianthomas23))
- List all playwright tests, even if they all pass [#230](https://github.com/jupyterlite/cockle/pull/230) ([@ianthomas23](https://github.com/ianthomas23))

### Contributors to this release

([GitHub contributors page for this release](https://github.com/jupyterlite/cockle/graphs/contributors?from=2025-07-21&to=2025-08-11&type=c))

[@ianthomas23](https://github.com/search?q=repo%3Ajupyterlite%2Fcockle+involves%3Aianthomas23+updated%3A2025-07-21..2025-08-11&type=Issues) | [@martinRenou](https://github.com/search?q=repo%3Ajupyterlite%2Fcockle+involves%3AmartinRenou+updated%3A2025-07-21..2025-08-11&type=Issues) | [@nakul-py](https://github.com/search?q=repo%3Ajupyterlite%2Fcockle+involves%3Anakul-py+updated%3A2025-07-21..2025-08-11&type=Issues)

## 0.1.3

([Full Changelog](https://github.com/jupyterlite/cockle/compare/v0.1.2...f8a4f57d35582fecdc95ba583b025a0f48e18097))

### Enhancements made

- Perform tab completion in `Options` classes [#225](https://github.com/jupyterlite/cockle/pull/225) ([@ianthomas23](https://github.com/ianthomas23))
- Cache `FS.stat` information during tab completion [#224](https://github.com/jupyterlite/cockle/pull/224) ([@ianthomas23](https://github.com/ianthomas23))
- Add framework to support tab completion for built-in commands [#222](https://github.com/jupyterlite/cockle/pull/222) ([@ianthomas23](https://github.com/ianthomas23))
- Improve tab completion of file and directory names [#221](https://github.com/jupyterlite/cockle/pull/221) ([@ianthomas23](https://github.com/ianthomas23))
- Make `IExternalOutput` compatible with `IOutput` [#220](https://github.com/jupyterlite/cockle/pull/220) ([@ianthomas23](https://github.com/ianthomas23))
- Pass command name in IContext rather than as separate argument to run() [#219](https://github.com/jupyterlite/cockle/pull/219) ([@ianthomas23](https://github.com/ianthomas23))
- Support setting environment variables in cockle-config-in.json [#212](https://github.com/jupyterlite/cockle/pull/212) ([@ianthomas23](https://github.com/ianthomas23))
- Make tab completion more modular [#210](https://github.com/jupyterlite/cockle/pull/210) ([@ianthomas23](https://github.com/ianthomas23))
- Move tab completion to separate class [#209](https://github.com/jupyterlite/cockle/pull/209) ([@ianthomas23](https://github.com/ianthomas23))
- Support subcommand options [#207](https://github.com/jupyterlite/cockle/pull/207) ([@ianthomas23](https://github.com/ianthomas23))
- Add TrailingPathsOption [#206](https://github.com/jupyterlite/cockle/pull/206) ([@ianthomas23](https://github.com/ianthomas23))

### Bugs fixed

- Correctly identify when writing to tty [#217](https://github.com/jupyterlite/cockle/pull/217) ([@ianthomas23](https://github.com/ianthomas23))
- Disable buffered IO before switching it [#208](https://github.com/jupyterlite/cockle/pull/208) ([@ianthomas23](https://github.com/ianthomas23))
- Avoid multiple concurrent theme change handlers [#205](https://github.com/jupyterlite/cockle/pull/205) ([@ianthomas23](https://github.com/ianthomas23))

### Maintenance and upkeep improvements

- Update lua to 5.4.8 [#218](https://github.com/jupyterlite/cockle/pull/218) ([@ianthomas23](https://github.com/ianthomas23))
- Add file read and write tests to WebAssembly and JavaScript commands [#216](https://github.com/jupyterlite/cockle/pull/216) ([@ianthomas23](https://github.com/ianthomas23))
- Comprehensive testing of JavaScriptCommand [#215](https://github.com/jupyterlite/cockle/pull/215) ([@ianthomas23](https://github.com/ianthomas23))
- Comprehensive testing of locally-built wasm command [#214](https://github.com/jupyterlite/cockle/pull/214) ([@ianthomas23](https://github.com/ianthomas23))

### Contributors to this release

([GitHub contributors page for this release](https://github.com/jupyterlite/cockle/graphs/contributors?from=2025-06-26&to=2025-07-21&type=c))

[@ianthomas23](https://github.com/search?q=repo%3Ajupyterlite%2Fcockle+involves%3Aianthomas23+updated%3A2025-06-26..2025-07-21&type=Issues)

## 0.1.2

This release adds support for the `less` command (with some significant limitations), various enhancements to external commands (TypeScript commands that run in the main UI thread), and initial support to determine the terminal background color to identify dark mode.

([Full Changelog](https://github.com/jupyterlite/cockle/compare/v0.1.1...38c4a1992a48bf4208532ff51f66c033173b9767))

### Enhancements made

- Increase theme change timeout to 100 ms [#203](https://github.com/jupyterlite/cockle/pull/203) ([@ianthomas23](https://github.com/ianthomas23))
- Use termios raw mode to get terminal background color [#202](https://github.com/jupyterlite/cockle/pull/202) ([@ianthomas23](https://github.com/ianthomas23))
- Use termios ONOCR instead of allowAdjacentNewline [#201](https://github.com/jupyterlite/cockle/pull/201) ([@ianthomas23](https://github.com/ianthomas23))
- Check if terminal is dark or light mode [#200](https://github.com/jupyterlite/cockle/pull/200) ([@ianthomas23](https://github.com/ianthomas23))
- Table layout API [#199](https://github.com/jupyterlite/cockle/pull/199) ([@ianthomas23](https://github.com/ianthomas23))
- Support multiple extra channels via `COCKLE_WASM_EXTRA_CHANNEL` [#198](https://github.com/jupyterlite/cockle/pull/198) ([@ianthomas23](https://github.com/ianthomas23))
- Improved `ExternalEnvironment` [#197](https://github.com/jupyterlite/cockle/pull/197) ([@ianthomas23](https://github.com/ianthomas23))
- Setting aliases and env vars via Shell constructor [#196](https://github.com/jupyterlite/cockle/pull/196) ([@ianthomas23](https://github.com/ianthomas23))
- Register external commands in Shell constructor only [#195](https://github.com/jupyterlite/cockle/pull/195) ([@ianthomas23](https://github.com/ianthomas23))
- Support 24-bit RGB foreground and background color in TS/JS commands [#194](https://github.com/jupyterlite/cockle/pull/194) ([@ianthomas23](https://github.com/ianthomas23))
- Add `less` WebAssembly command [#191](https://github.com/jupyterlite/cockle/pull/191) ([@ianthomas23](https://github.com/ianthomas23))
- Implement stdin for external commands [#189](https://github.com/jupyterlite/cockle/pull/189) ([@ianthomas23](https://github.com/ianthomas23))

### Maintenance and upkeep improvements

- Add tests for `nano` and `vim` editors [#190](https://github.com/jupyterlite/cockle/pull/190) ([@ianthomas23](https://github.com/ianthomas23))

### Documentation improvements

- Remove stale changelog entries for pre-releases [#204](https://github.com/jupyterlite/cockle/pull/204) ([@ianthomas23](https://github.com/ianthomas23))

### Contributors to this release

([GitHub contributors page for this release](https://github.com/jupyterlite/cockle/graphs/contributors?from=2025-06-06&to=2025-06-26&type=c))

[@ianthomas23](https://github.com/search?q=repo%3Ajupyterlite%2Fcockle+involves%3Aianthomas23+updated%3A2025-06-06..2025-06-26&type=Issues)

## 0.1.1

This is a bug fix release to fix bugs in URLs and the use of ServiceWorker for `stdin`.

([Full Changelog](https://github.com/jupyterlite/cockle/compare/v0.1.0...d85122898fee1fd7ec69ed1dae85b522132d75e9))

### Enhancements made

- Add git2cpp to demo [#185](https://github.com/jupyterlite/cockle/pull/185) ([@ianthomas23](https://github.com/ianthomas23))

### Bugs fixed

- Fix handling of timeout when vim uses service worker for stdin [#188](https://github.com/jupyterlite/cockle/pull/188) ([@ianthomas23](https://github.com/ianthomas23))
- Join URLs correctly with a single slash between baseUrl and path [#187](https://github.com/jupyterlite/cockle/pull/187) ([@ianthomas23](https://github.com/ianthomas23))

### Contributors to this release

([GitHub contributors page for this release](https://github.com/jupyterlite/cockle/graphs/contributors?from=2025-06-04&to=2025-06-06&type=c))

[@ianthomas23](https://github.com/search?q=repo%3Ajupyterlite%2Fcockle+involves%3Aianthomas23+updated%3A2025-06-04..2025-06-06&type=Issues)

## 0.1.0

This release adds support for using a ServiceWorker to provide `stdin` whilst commands are running, as an alternative to the existing SharedArrayBuffer implementation. If running in the [terminal](https://github.com/jupyterlite/terminal) the ServiceWorker is provided by JupyterLite, alternatively the ServiceWorker implementation provided here can be used instead as shown in the `demo`. Use of a ServiceWorker means it is no longer necessary to serve `cockle` using cross-origin headers.

If served with cross-origin headers both the SharedArrayBuffer and ServiceWorker `stdin` implementations will be available, with SharedArrayBuffer used by default. The user can switch between them at runtime using the shell command `cockle-config -s`.

This release also adds experimental support for two new classes of command:

- JavaScript command: runs in the WebWorker but the implementation is pure JavaScript, it does not include compiled WebAssembly.
- External command: runs in the main UI thread, intended to access JupyterLite internals.

Both of these are more limited than WebAssembly commands, and are labelled experimental as their APIs will definitely change.

([Full Changelog](https://github.com/jupyterlite/cockle/compare/7050e0a96...4b9d69880c68a2c8267c41283aa09415692451a1))

### Enhancements made

- Use `IOptions` when `registerExternalCommand` [#183](https://github.com/jupyterlite/cockle/pull/183) ([@ianthomas23](https://github.com/ianthomas23))
- Include command name in `IExternalContext` and `IJavaScriptContext` [#181](https://github.com/jupyterlite/cockle/pull/181) ([@ianthomas23](https://github.com/ianthomas23))
- Terminal service worker support [#180](https://github.com/jupyterlite/cockle/pull/180) ([@ianthomas23](https://github.com/ianthomas23))
- Add experimental support for external commands [#178](https://github.com/jupyterlite/cockle/pull/178) ([@ianthomas23](https://github.com/ianthomas23))
- Keep a permanent IContext in ShellImpl, don't recreate for each command run [#175](https://github.com/jupyterlite/cockle/pull/175) ([@ianthomas23](https://github.com/ianthomas23))
- Support use of ServiceWorker for synchronous stdin [#174](https://github.com/jupyterlite/cockle/pull/174) ([@ianthomas23](https://github.com/ianthomas23))
- Rename input options shellId and baseUrl [#173](https://github.com/jupyterlite/cockle/pull/173) ([@ianthomas23](https://github.com/ianthomas23))
- Shell id, and stored in static ShellManager [#172](https://github.com/jupyterlite/cockle/pull/172) ([@ianthomas23](https://github.com/ianthomas23))

### Maintenance and upkeep improvements

- Prepare for v0.1.0 release [#184](https://github.com/jupyterlite/cockle/pull/184) ([@ianthomas23](https://github.com/ianthomas23))
- Deploy on github pages [#182](https://github.com/jupyterlite/cockle/pull/182) ([@ianthomas23](https://github.com/ianthomas23))

### Contributors to this release

([GitHub contributors page for this release](https://github.com/jupyterlite/cockle/graphs/contributors?from=2025-04-22&to=2025-06-04&type=c))

[@ianthomas23](https://github.com/search?q=repo%3Ajupyterlite%2Fcockle+involves%3Aianthomas23+updated%3A2025-04-22..2025-06-04&type=Issues)

## 0.0.19

([Full Changelog](https://github.com/jupyterlite/cockle/compare/v0.0.18...9ace79232f4aada96475a6b87336d5665ba0fc20))

### Enhancements made

- Add optional `browsingContextId` to `IShell.IOptions` and `IDriveFSOptions` [#171](https://github.com/jupyterlite/cockle/pull/171) ([@ianthomas23](https://github.com/ianthomas23))
- Negative timeout passed to `poll()` means infinite timeout [#170](https://github.com/jupyterlite/cockle/pull/170) ([@ianthomas23](https://github.com/ianthomas23))
- Support async read from stdin in JavaScript commands [#169](https://github.com/jupyterlite/cockle/pull/169) ([@ianthomas23](https://github.com/ianthomas23))
- Add command information to `cockle-config` [#166](https://github.com/jupyterlite/cockle/pull/166) ([@ianthomas23](https://github.com/ianthomas23))
- Refactor SharedArrayBuffer buffered IO [#164](https://github.com/jupyterlite/cockle/pull/164) ([@ianthomas23](https://github.com/ianthomas23))
- Output via postMessage rather than SharedArrayBuffer [#163](https://github.com/jupyterlite/cockle/pull/163) ([@ianthomas23](https://github.com/ianthomas23))

### Maintenance and upkeep improvements

- Remove micromamba pin in CI [#168](https://github.com/jupyterlite/cockle/pull/168) ([@ianthomas23](https://github.com/ianthomas23))
- Add unit tests alongside existing integration tests [#167](https://github.com/jupyterlite/cockle/pull/167) ([@ianthomas23](https://github.com/ianthomas23))
- Add tests for built-in command Options [#165](https://github.com/jupyterlite/cockle/pull/165) ([@ianthomas23](https://github.com/ianthomas23))

### Contributors to this release

([GitHub contributors page for this release](https://github.com/jupyterlite/cockle/graphs/contributors?from=2025-03-12&to=2025-04-22&type=c))

[@ianthomas23](https://github.com/search?q=repo%3Ajupyterlite%2Fcockle+involves%3Aianthomas23+updated%3A2025-03-12..2025-04-22&type=Issues)

## 0.0.18

([Full Changelog](https://github.com/jupyterlite/cockle/compare/v0.0.17...60c9aae1e63c57eef610c7c589e9bcd47817a502))

### Bugs fixed

- Revert some emscripten type changes [#162](https://github.com/jupyterlite/cockle/pull/162) ([@ianthomas23](https://github.com/ianthomas23))

### Contributors to this release

([GitHub contributors page for this release](https://github.com/jupyterlite/cockle/graphs/contributors?from=2025-03-12&to=2025-03-12&type=c))

[@ianthomas23](https://github.com/search?q=repo%3Ajupyterlite%2Fcockle+involves%3Aianthomas23+updated%3A2025-03-12..2025-03-12&type=Issues)

## 0.0.17

This release adds support for the WebAssembly commands `nano` and `sed`, and preliminary support for JavaScript commands.

([Full Changelog](https://github.com/jupyterlite/cockle/compare/v0.0.16...b2ab16d7b3f715d609fcbe396392aec98d668d01))

### Enhancements made

- Build JavaScript commands for testing using rollup [#161](https://github.com/jupyterlite/cockle/pull/161) ([@ianthomas23](https://github.com/ianthomas23))
- Add sideEffects config to package.json [#160](https://github.com/jupyterlite/cockle/pull/160) ([@ianthomas23](https://github.com/ianthomas23))
- Support returning all buffered characters in stdin read function [#159](https://github.com/jupyterlite/cockle/pull/159) ([@ianthomas23](https://github.com/ianthomas23))
- Use maxChars when reading input from wasm command [#156](https://github.com/jupyterlite/cockle/pull/156) ([@ianthomas23](https://github.com/ianthomas23))
- Set an initial size for terminal in tests [#154](https://github.com/jupyterlite/cockle/pull/154) ([@ianthomas23](https://github.com/ianthomas23))
- Add support for nano editor [#153](https://github.com/jupyterlite/cockle/pull/153) ([@ianthomas23](https://github.com/ianthomas23))
- Support WebAssembly source map files [#150](https://github.com/jupyterlite/cockle/pull/150) ([@ianthomas23](https://github.com/ianthomas23))
- Use input read() function rather than get_char() to read multiple characters at a time [#147](https://github.com/jupyterlite/cockle/pull/147) ([@ianthomas23](https://github.com/ianthomas23))
- Support dynamic loading of JavaScript commands [#146](https://github.com/jupyterlite/cockle/pull/146) ([@ianthomas23](https://github.com/ianthomas23))
- Add new command `sed`, always available [#144](https://github.com/jupyterlite/cockle/pull/144) ([@ianthomas23](https://github.com/ianthomas23))
- Add tee command [#143](https://github.com/jupyterlite/cockle/pull/143) ([@ianthomas23](https://github.com/ianthomas23))
- Use TypeScript type definitions for WebAssembly modules [#140](https://github.com/jupyterlite/cockle/pull/140) ([@ianthomas23](https://github.com/ianthomas23))
- Print micromamba version used to deploy [#138](https://github.com/jupyterlite/cockle/pull/138) ([@ianthomas23](https://github.com/ianthomas23))
- Refactor wasm loading and running to make more generic [#137](https://github.com/jupyterlite/cockle/pull/137) ([@ianthomas23](https://github.com/ianthomas23))

### Bugs fixed

- Remove extraneous newline when closing vim or nano [#158](https://github.com/jupyterlite/cockle/pull/158) ([@ianthomas23](https://github.com/ianthomas23))
- Stop download notification if fail to importScripts [#139](https://github.com/jupyterlite/cockle/pull/139) ([@ianthomas23](https://github.com/ianthomas23))

### Maintenance and upkeep improvements

- Reuse common key definitions in in-browser tests [#155](https://github.com/jupyterlite/cockle/pull/155) ([@ianthomas23](https://github.com/ianthomas23))
- Add vim test using multi-char escape sequences (arrow keys) [#151](https://github.com/jupyterlite/cockle/pull/151) ([@ianthomas23](https://github.com/ianthomas23))
- Simplify syntax of Options argument parsing [#141](https://github.com/jupyterlite/cockle/pull/141) ([@ianthomas23](https://github.com/ianthomas23))
- Use interface IContext instead of class Context [#136](https://github.com/jupyterlite/cockle/pull/136) ([@ianthomas23](https://github.com/ianthomas23))
- Move mountpoint to IFileSystem [#135](https://github.com/jupyterlite/cockle/pull/135) ([@ianthomas23](https://github.com/ianthomas23))

### Contributors to this release

([GitHub contributors page for this release](https://github.com/jupyterlite/cockle/graphs/contributors?from=2025-02-18&to=2025-03-12&type=c))

[@ianthomas23](https://github.com/search?q=repo%3Ajupyterlite%2Fcockle+involves%3Aianthomas23+updated%3A2025-02-18..2025-03-12&type=Issues)

## 0.0.16

([Full Changelog](https://github.com/jupyterlite/cockle/compare/v0.0.15...d57db66a05507ed26983764309d6c75584062632))

### Enhancements made

- Use switch statements instead of nested if-else [#134](https://github.com/jupyterlite/cockle/pull/134) ([@ianthomas23](https://github.com/ianthomas23))
- Remove JupyterLite dependencies [#133](https://github.com/jupyterlite/cockle/pull/133) ([@ianthomas23](https://github.com/ianthomas23))

### Bugs fixed

- Use ready promise before starting shell [#132](https://github.com/jupyterlite/cockle/pull/132) ([@ianthomas23](https://github.com/ianthomas23))

### Documentation improvements

- Update screenshot in README [#120](https://github.com/jupyterlite/cockle/pull/120) ([@ianthomas23](https://github.com/ianthomas23))

### Contributors to this release

([GitHub contributors page for this release](https://github.com/jupyterlite/cockle/graphs/contributors?from=2025-02-05&to=2025-02-18&type=c))

[@ianthomas23](https://github.com/search?q=repo%3Ajupyterlite%2Fcockle+involves%3Aianthomas23+updated%3A2025-02-05..2025-02-18&type=Issues)

## 0.0.15

([Full Changelog](https://github.com/jupyterlite/cockle/compare/v0.0.14...0c68d554a20e4ca793245566fb2a8924614d70a1))

### Bugs fixed

- Use service worker based DriveFS [#107](https://github.com/jupyterlite/cockle/pull/107) ([@ianthomas23](https://github.com/ianthomas23))

### Maintenance and upkeep improvements

- Add deepmerge-ts to dependencies [#104](https://github.com/jupyterlite/cockle/pull/104) ([@ianthomas23](https://github.com/ianthomas23))

### Contributors to this release

([GitHub contributors page for this release](https://github.com/jupyterlite/cockle/graphs/contributors?from=2025-02-04&to=2025-02-05&type=c))

[@ianthomas23](https://github.com/search?q=repo%3Ajupyterlite%2Fcockle+involves%3Aianthomas23+updated%3A2025-02-04..2025-02-05&type=Issues)

## 0.0.14

([Full Changelog](https://github.com/jupyterlite/cockle/compare/v0.0.13...124730bc4d052625a02a34ea78b921dedefb206a))

### Enhancements made

- Provide visual feedback when downloading wasm modules [#103](https://github.com/jupyterlite/cockle/pull/103) ([@ianthomas23](https://github.com/ianthomas23))
- Log termios changes to console [#101](https://github.com/jupyterlite/cockle/pull/101) ([@ianthomas23](https://github.com/ianthomas23))
- Support aliases in cockle-config.json [#100](https://github.com/jupyterlite/cockle/pull/100) ([@ianthomas23](https://github.com/ianthomas23))
- Improve config JSON file format [#99](https://github.com/jupyterlite/cockle/pull/99) ([@ianthomas23](https://github.com/ianthomas23))
- Use separate directories for wasm command packages [#98](https://github.com/jupyterlite/cockle/pull/98) ([@ianthomas23](https://github.com/ianthomas23))
- Build wasm-util using emsdk 3.1.73 [#96](https://github.com/jupyterlite/cockle/pull/96) ([@ianthomas23](https://github.com/ianthomas23))
- Add emscripten-forge-dev channel [#95](https://github.com/jupyterlite/cockle/pull/95) ([@ianthomas23](https://github.com/ianthomas23))
- Handle onExit callback from wasm to set exit code [#94](https://github.com/jupyterlite/cockle/pull/94) ([@ianthomas23](https://github.com/ianthomas23))
- Display wasm module cache status in cockle-config [#92](https://github.com/jupyterlite/cockle/pull/92) ([@ianthomas23](https://github.com/ianthomas23))

### Maintenance and upkeep improvements

- Remove use of default emscripten-forge channel [#102](https://github.com/jupyterlite/cockle/pull/102) ([@ianthomas23](https://github.com/ianthomas23))

### Contributors to this release

([GitHub contributors page for this release](https://github.com/jupyterlite/cockle/graphs/contributors?from=2025-01-06&to=2025-02-04&type=c))

[@ianthomas23](https://github.com/search?q=repo%3Ajupyterlite%2Fcockle+involves%3Aianthomas23+updated%3A2025-01-06..2025-02-04&type=Issues)

## 0.0.13

([Full Changelog](https://github.com/jupyterlite/cockle/compare/v0.0.12...1ac07c19492547e5b5769c11f103aa79ff465e98))

### Enhancements made

- Make external IOutputCallback synchronous [#90](https://github.com/jupyterlite/cockle/pull/90) ([@ianthomas23](https://github.com/ianthomas23))
- Build local-cmd in wasm-util [#88](https://github.com/jupyterlite/cockle/pull/88) ([@ianthomas23](https://github.com/ianthomas23))

### Bugs fixed

- Fix blocking writes by correctly handling Atomics.waitAsync returns [#91](https://github.com/jupyterlite/cockle/pull/91) ([@ianthomas23](https://github.com/ianthomas23))

### Contributors to this release

([GitHub contributors page for this release](https://github.com/jupyterlite/cockle/graphs/contributors?from=2024-12-13&to=2025-01-06&type=c))

[@ianthomas23](https://github.com/search?q=repo%3Ajupyterlite%2Fcockle+involves%3Aianthomas23+updated%3A2024-12-13..2025-01-06&type=Issues)

## 0.0.12

([Full Changelog](https://github.com/jupyterlite/cockle/compare/v0.0.11...e7c7ec3ee256595d13ab4a26e5c18a957bc9a1e8))

### Enhancements made

- Support unicode output from commands [#87](https://github.com/jupyterlite/cockle/pull/87) ([@ianthomas23](https://github.com/ianthomas23))
- Add support for vim [#86](https://github.com/jupyterlite/cockle/pull/86) ([@ianthomas23](https://github.com/ianthomas23))
- Convert ~ to HOME in local package config [#85](https://github.com/jupyterlite/cockle/pull/85) ([@ianthomas23](https://github.com/ianthomas23))
- Move stdin echoing to BufferedIO [#84](https://github.com/jupyterlite/cockle/pull/84) ([@ianthomas23](https://github.com/ianthomas23))
- Add basic termios support [#83](https://github.com/jupyterlite/cockle/pull/83) ([@ianthomas23](https://github.com/ianthomas23))
- Remove some missed async flush calls [#82](https://github.com/jupyterlite/cockle/pull/82) ([@ianthomas23](https://github.com/ianthomas23))
- Add MockTerminalOutput.textAndClear function [#81](https://github.com/jupyterlite/cockle/pull/81) ([@ianthomas23](https://github.com/ianthomas23))
- Support multi-character inputs (escape sequences) whilst command running [#80](https://github.com/jupyterlite/cockle/pull/80) ([@ianthomas23](https://github.com/ianthomas23))
- Add COCKLE_WASM_EXTRA_CHANNEL env var to get wasm command packages from an extra channel [#79](https://github.com/jupyterlite/cockle/pull/79) ([@ianthomas23](https://github.com/ianthomas23))

### Contributors to this release

([GitHub contributors page for this release](https://github.com/jupyterlite/cockle/graphs/contributors?from=2024-11-29&to=2024-12-13&type=c))

[@ianthomas23](https://github.com/search?q=repo%3Ajupyterlite%2Fcockle+involves%3Aianthomas23+updated%3A2024-11-29..2024-12-13&type=Issues)

## 0.0.11

([Full Changelog](https://github.com/jupyterlite/cockle/compare/v0.0.10...d473de0953b751083e50cfb7177473a76602ac06))

### Enhancements made

- Use xtermjs onData rather than onKey [#78](https://github.com/jupyterlite/cockle/pull/78) ([@ianthomas23](https://github.com/ianthomas23))
- Always use buffered output via SharedArrayBuffer [#77](https://github.com/jupyterlite/cockle/pull/77) ([@ianthomas23](https://github.com/ianthomas23))
- Support wasm commands from a local directory as well as emscripten-forge [#73](https://github.com/jupyterlite/cockle/pull/73) ([@ianthomas23](https://github.com/ianthomas23))
- Check and recreate cockle_wasm_env if it does not contain all required packages [#72](https://github.com/jupyterlite/cockle/pull/72) ([@ianthomas23](https://github.com/ianthomas23))
- Separate external and internal defs [#70](https://github.com/jupyterlite/cockle/pull/70) ([@ianthomas23](https://github.com/ianthomas23))
- Add tests for cp and mv [#68](https://github.com/jupyterlite/cockle/pull/68) ([@ianthomas23](https://github.com/ianthomas23))
- Support filename expansion of \* and ? [#67](https://github.com/jupyterlite/cockle/pull/67) ([@ianthomas23](https://github.com/ianthomas23))
- Add Shell.dispose and new exit command [#66](https://github.com/jupyterlite/cockle/pull/66) ([@ianthomas23](https://github.com/ianthomas23))

### Bugs fixed

- Support local_directory wasm install in JupyterLite Terminal [#76](https://github.com/jupyterlite/cockle/pull/76) ([@ianthomas23](https://github.com/ianthomas23))

### Maintenance and upkeep improvements

- Be more tolerant of how micromamba is installed [#75](https://github.com/jupyterlite/cockle/pull/75) ([@ianthomas23](https://github.com/ianthomas23))
- Ensure function names are camelCase [#69](https://github.com/jupyterlite/cockle/pull/69) ([@ianthomas23](https://github.com/ianthomas23))
- Run end-to-end tests on macos as well as ubuntu [#65](https://github.com/jupyterlite/cockle/pull/65) ([@ianthomas23](https://github.com/ianthomas23))
- Add playwright visual test using demo [#64](https://github.com/jupyterlite/cockle/pull/64) ([@ianthomas23](https://github.com/ianthomas23))

### Contributors to this release

([GitHub contributors page for this release](https://github.com/jupyterlite/cockle/graphs/contributors?from=2024-10-23&to=2024-11-29&type=c))

[@ianthomas23](https://github.com/search?q=repo%3Ajupyterlite%2Fcockle+involves%3Aianthomas23+updated%3A2024-10-23..2024-11-29&type=Issues)

## 0.0.10

([Full Changelog](https://github.com/jupyterlite/cockle/compare/v0.0.9...c0e5440f4fb4963c2cd433b07f9936c42097beeb))

### Enhancements made

- Validate JSON config files [#63](https://github.com/jupyterlite/cockle/pull/63) ([@ianthomas23](https://github.com/ianthomas23))
- Show wasm package info in cockle-config command [#62](https://github.com/jupyterlite/cockle/pull/62) ([@ianthomas23](https://github.com/ianthomas23))

### Contributors to this release

([GitHub contributors page for this release](https://github.com/jupyterlite/cockle/graphs/contributors?from=2024-10-07&to=2024-10-23&type=c))

[@ianthomas23](https://github.com/search?q=repo%3Ajupyterlite%2Fcockle+involves%3Aianthomas23+updated%3A2024-10-07..2024-10-23&type=Issues)

## 0.0.9

([Full Changelog](https://github.com/jupyterlite/cockle/compare/v0.0.8...b981d692a28755b1c9329a65206c9f2ef3139b42))

### Enhancements made

- Obtain wasm packages from emscripten-forge when building deployment [#61](https://github.com/jupyterlite/cockle/pull/61) ([@ianthomas23](https://github.com/ianthomas23))
- Add new cockle-config command that prints cockle version [#60](https://github.com/jupyterlite/cockle/pull/60) ([@ianthomas23](https://github.com/ianthomas23))

### Bugs fixed

- Prevent use of color in command output to file [#59](https://github.com/jupyterlite/cockle/pull/59) ([@ianthomas23](https://github.com/ianthomas23))

### Contributors to this release

([GitHub contributors page for this release](https://github.com/jupyterlite/cockle/graphs/contributors?from=2024-09-11&to=2024-10-07&type=c))

[@ianthomas23](https://github.com/search?q=repo%3Ajupyterlite%2Fcockle+involves%3Aianthomas23+updated%3A2024-09-11..2024-10-07&type=Issues)

## 0.0.8

([Full Changelog](https://github.com/jupyterlite/cockle/compare/v0.0.7...c226ca913081827957862d27697b3c122ecafb0e))

### Enhancements made

- Prebuild worker bundle and import WASM files from same directory as JS wrappers [#57](https://github.com/jupyterlite/cockle/pull/57) ([@ianthomas23](https://github.com/ianthomas23))
- Add lua WASM command [#56](https://github.com/jupyterlite/cockle/pull/56) ([@ianthomas23](https://github.com/ianthomas23))
- Echo buffered stdin (whilst running a command) back to stdout [#52](https://github.com/jupyterlite/cockle/pull/52) ([@ianthomas23](https://github.com/ianthomas23))
- Standardise linefeed/newline handling [#51](https://github.com/jupyterlite/cockle/pull/51) ([@ianthomas23](https://github.com/ianthomas23))

### Bugs fixed

- Ignore touch bad file descriptor, but still have incorrect exit code [#53](https://github.com/jupyterlite/cockle/pull/53) ([@ianthomas23](https://github.com/ianthomas23))
- Support repeat use of BufferedStdin [#49](https://github.com/jupyterlite/cockle/pull/49) ([@ianthomas23](https://github.com/ianthomas23))

### Maintenance and upkeep improvements

- Remove @jupyterlab/services as a dependency [#54](https://github.com/jupyterlite/cockle/pull/54) ([@ianthomas23](https://github.com/ianthomas23))
- Update to jupyterlab 7.2.5 and jupyterlite 0.4.1 [#47](https://github.com/jupyterlite/cockle/pull/47) ([@ianthomas23](https://github.com/ianthomas23))

### Contributors to this release

([GitHub contributors page for this release](https://github.com/jupyterlite/cockle/graphs/contributors?from=2024-08-19&to=2024-09-11&type=c))

[@ianthomas23](https://github.com/search?q=repo%3Ajupyterlite%2Fcockle+involves%3Aianthomas23+updated%3A2024-08-19..2024-09-11&type=Issues)

## 0.0.7

([Full Changelog](https://github.com/jupyterlite/cockle/compare/v0.0.6...e6f58e3778e92e0bd77aef40c7ae8b18b3346be0))

### Maintenance and upkeep improvements

- Fix packaging of wasm files [#46](https://github.com/jupyterlite/cockle/pull/46) ([@ianthomas23](https://github.com/ianthomas23))

### Contributors to this release

([GitHub contributors page for this release](https://github.com/jupyterlite/cockle/graphs/contributors?from=2024-08-19&to=2024-08-19&type=c))

[@ianthomas23](https://github.com/search?q=repo%3Ajupyterlite%2Fcockle+involves%3Aianthomas23+updated%3A2024-08-19..2024-08-19&type=Issues)

## 0.0.6

([Full Changelog](https://github.com/jupyterlite/cockle/compare/v0.0.5...1fac256426fd3e98835e7e2132c1534b5487b939))

### Enhancements made

- Support separate WASM/JS files and remove use of callMain [#44](https://github.com/jupyterlite/cockle/pull/44) ([@ianthomas23](https://github.com/ianthomas23))
- Add browser-based interactive demo [#43](https://github.com/jupyterlite/cockle/pull/43) ([@ianthomas23](https://github.com/ianthomas23))
- Load WASM/JS modules dynamically using importScripts [#40](https://github.com/jupyterlite/cockle/pull/40) ([@ianthomas23](https://github.com/ianthomas23))
- Use WebWorker [#38](https://github.com/jupyterlite/cockle/pull/38) ([@ianthomas23](https://github.com/ianthomas23))
- Obtain WASM/JS files from emscripten-forge [#37](https://github.com/jupyterlite/cockle/pull/37) ([@ianthomas23](https://github.com/ianthomas23))
- Add clear built-in command [#36](https://github.com/jupyterlite/cockle/pull/36) ([@ianthomas23](https://github.com/ianthomas23))
- Support command-line editing [#35](https://github.com/jupyterlite/cockle/pull/35) ([@ianthomas23](https://github.com/ianthomas23))
- Separate module for ANSI escape sequences [#34](https://github.com/jupyterlite/cockle/pull/34) ([@ianthomas23](https://github.com/ianthomas23))
- Add export command [#33](https://github.com/jupyterlite/cockle/pull/33) ([@ianthomas23](https://github.com/ianthomas23))
- Tab complete file and directory names [#32](https://github.com/jupyterlite/cockle/pull/32) ([@ianthomas23](https://github.com/ianthomas23))
- Add options/flags for built-in commands [#31](https://github.com/jupyterlite/cockle/pull/31) ([@ianthomas23](https://github.com/ianthomas23))
- Return exit codes from commands and set $? [#30](https://github.com/jupyterlite/cockle/pull/30) ([@ianthomas23](https://github.com/ianthomas23))
- Use separate TerminalOutput for stderr [#28](https://github.com/jupyterlite/cockle/pull/28) ([@ianthomas23](https://github.com/ianthomas23))
- Improvements to command/alias tab completion [#27](https://github.com/jupyterlite/cockle/pull/27) ([@ianthomas23](https://github.com/ianthomas23))
- Support quotes in command line [#26](https://github.com/jupyterlite/cockle/pull/26) ([@ianthomas23](https://github.com/ianthomas23))

### Maintenance and upkeep improvements

- Pre-install micromamba in release actions [#45](https://github.com/jupyterlite/cockle/pull/45) ([@ianthomas23](https://github.com/ianthomas23))
- Update releaser artifact name [#39](https://github.com/jupyterlite/cockle/pull/39) ([@jtpio](https://github.com/jtpio))
- Use playwright and rspack for testing [#29](https://github.com/jupyterlite/cockle/pull/29) ([@ianthomas23](https://github.com/ianthomas23))
- Add linting [#24](https://github.com/jupyterlite/cockle/pull/24) ([@ianthomas23](https://github.com/ianthomas23))

### Contributors to this release

([GitHub contributors page for this release](https://github.com/jupyterlite/cockle/graphs/contributors?from=2024-07-22&to=2024-08-19&type=c))

[@ianthomas23](https://github.com/search?q=repo%3Ajupyterlite%2Fcockle+involves%3Aianthomas23+updated%3A2024-07-22..2024-08-19&type=Issues) | [@jtpio](https://github.com/search?q=repo%3Ajupyterlite%2Fcockle+involves%3Ajtpio+updated%3A2024-07-22..2024-08-19&type=Issues)

## 0.0.5

([Full Changelog](https://github.com/jupyterlite/cockle/compare/v0.0.4...77129154f8963528fdd7254e835002be04c10865))

### Enhancements made

- Add buffered stdin to accept terminal input whilst WASM commands running [#23](https://github.com/jupyterlite/cockle/pull/23) ([@ianthomas23](https://github.com/ianthomas23))
- Support coloured output for ls and grep commands [#22](https://github.com/jupyterlite/cockle/pull/22) ([@ianthomas23](https://github.com/ianthomas23))
- Add support for aliases [#21](https://github.com/jupyterlite/cockle/pull/21) ([@ianthomas23](https://github.com/ianthomas23))
- History maxSize and ignore duplicates and leading whitespace [#20](https://github.com/jupyterlite/cockle/pull/20) ([@ianthomas23](https://github.com/ianthomas23))
- Support terminal handling of columns [#19](https://github.com/jupyterlite/cockle/pull/19) ([@ianthomas23](https://github.com/ianthomas23))
- Add storage of command history [#15](https://github.com/jupyterlite/cockle/pull/15) ([@ianthomas23](https://github.com/ianthomas23))
- Implement pipes [#14](https://github.com/jupyterlite/cockle/pull/14) ([@ianthomas23](https://github.com/ianthomas23))
- Check WASM module properties exist before using [#13](https://github.com/jupyterlite/cockle/pull/13) ([@ianthomas23](https://github.com/ianthomas23))
- Add support for stdin redirect from file such as 'wc \< somefile' [#12](https://github.com/jupyterlite/cockle/pull/12) ([@ianthomas23](https://github.com/ianthomas23))
- Support 'cd -' [#11](https://github.com/jupyterlite/cockle/pull/11) ([@ianthomas23](https://github.com/ianthomas23))
- Support environment variables that persist beyond single commands [#10](https://github.com/jupyterlite/cockle/pull/10) ([@ianthomas23](https://github.com/ianthomas23))
- Support output to file, including append [#9](https://github.com/jupyterlite/cockle/pull/9) ([@ianthomas23](https://github.com/ianthomas23))
- Add grep command [#7](https://github.com/jupyterlite/cockle/pull/7) ([@ianthomas23](https://github.com/ianthomas23))

### Contributors to this release

([GitHub contributors page for this release](https://github.com/jupyterlite/cockle/graphs/contributors?from=2024-07-04&to=2024-07-22&type=c))

[@ianthomas23](https://github.com/search?q=repo%3Ajupyterlite%2Fcockle+involves%3Aianthomas23+updated%3A2024-07-04..2024-07-22&type=Issues)

## 0.0.4

([Full Changelog](https://github.com/jupyterlite/cockle/compare/v0.0.3...da2f7736a262bd7561d335f20b9c5cfeedb4976d))

### Enhancements made

- Use WASM commands [#6](https://github.com/jupyterlite/cockle/pull/6) ([@ianthomas23](https://github.com/ianthomas23))

### Bugs fixed

- Fix empty listing [#5](https://github.com/jupyterlite/cockle/pull/5) ([@ianthomas23](https://github.com/ianthomas23))

### Contributors to this release

([GitHub contributors page for this release](https://github.com/jupyterlite/cockle/graphs/contributors?from=2024-05-29&to=2024-07-04&type=c))

[@ianthomas23](https://github.com/search?q=repo%3Ajupyterlite%2Fcockle+involves%3Aianthomas23+updated%3A2024-05-29..2024-07-04&type=Issues)

## 0.0.3

([Full Changelog](https://github.com/jupyterlite/cockle/compare/564c3eeb2cac64b3a9c4cf40d5c04b76aeda5707...fb1b4b169d63334cc1e0b65007dc6012c971629e))

### Maintenance and upkeep improvements

- Update default version spec to `patch` [#4](https://github.com/jupyterlite/cockle/pull/4) ([@jtpio](https://github.com/jtpio))
- Add releaser workflows [#3](https://github.com/jupyterlite/cockle/pull/3) ([@jtpio](https://github.com/jtpio))
- Rename package to `@jupyterlite/cockle` [#2](https://github.com/jupyterlite/cockle/pull/2) ([@jtpio](https://github.com/jtpio))

### Contributors to this release

([GitHub contributors page for this release](https://github.com/jupyterlite/cockle/graphs/contributors?from=2024-04-17&to=2024-05-29&type=c))

[@jtpio](https://github.com/search?q=repo%3Ajupyterlite%2Fcockle+involves%3Ajtpio+updated%3A2024-04-17..2024-05-29&type=Issues)
