# Changelog

<!-- <START NEW CHANGELOG ENTRY> -->

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

<!-- <END NEW CHANGELOG ENTRY> -->

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
