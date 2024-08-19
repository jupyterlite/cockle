# Changelog

<!-- <START NEW CHANGELOG ENTRY> -->

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

<!-- <END NEW CHANGELOG ENTRY> -->

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
