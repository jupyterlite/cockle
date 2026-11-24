# sample-commands

Sample commands of the following types that are used in both the `demo` and the `tests`:

- `external`: external commands that run in the main UI thread, registered using the
  `externalCommands` shell option.
- `util-js`: JavaScript commands, see [util-js/README.md](util-js/README.md).
- `util-wasm`: WebAssembly commands, see [util-wasm/README.md](util-wasm/README.md).

The JavaScript and WebAssembly commands are loaded using `local_directory` entries in
`test/cockle-config-in.json` and `demo/cockle-config-in.json`.
