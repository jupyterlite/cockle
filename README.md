# cockle

In-browser bash-like shell implemented in a combination of TypeScript and WebAssembly.

Used in the [JupyterLite terminal extension](https://github.com/jupyterlite/terminal).

Try it out outside of JupyterLite on GitHub Pages at https://jupyterlite.github.io/cockle.

Commands of the following types are supported:

1. Built-in TypeScript commands such as `history`. The source code for these is within this repo.
2. WebAssembly commands, from C/C++ source code, compiled into `.js` and `.wasm` files.
   These are usually built by [Emscripten-forge](https://emscripten-forge.org/) although they can be
   manually built, and are added to a deployment during the deployment build process.
3. JavaScript commands that are loaded and run in the same as WebAssembly commands except they have
   a `.js` file and no `.wasm` file. There is an example of creating a JavaScript command from
   TypeScript source code for use in the Jupyterlite terminal in the
   [terminal-javascript-command](https://github.com/ianthomas23/terminal-javascript-command) repo.
4. External commands which are TypeScript commands that run in the main browser UI thread rather
   than the WebWorker that the `cockle` shell runs in. These are registered when a `cockle` `Shell`
   is constructed. There is an example of an external command which is packaged as a JupyterLite
   extension in the
   [terminal-external-command](https://github.com/ianthomas23/terminal-external-command) repo.

[Emscripten-forge](https://emscripten-forge.org/) packages containing WebAssembly commands that are
currently supported and tested are as follows. Each package contains a single commmand with the same
name as the package unless otherwise specified:

- `coreutils`: multiple core commands including `cat`, `cp`, `echo`, `ls`, `mkdir`, `mv`, `rm`, `touch`, `uname`, and `wc`
- [`git2cpp`](https://git2cpp.readthedocs.io/): a `git` implementation
- `grep`
- `less`
- `lua`
- `nano`
- `sed`
- `tree`
- `vim`

## Version compatibility

The filesystem used in `cockle` is built using a specific version of Emscripten, and for maximum
compatibility the WebAssembly commands used in `cockle` should be built using the same version of
Emscripten. WebAssembly commands built on Emscripten-forge are hosted on different
[prefix.dev](https://prefix.dev/channels) channels depending on the Emscripten version.

| `cockle` version    | `emscripten` version | `prefix.dev` channel   |
| ------------------- | -------------------- | ---------------------- |
| >= 1.4.0            | 4.0.9                | `emscripten-forge-4x`  |
| >= 0.1.14, <= 1.3.0 | 3.1.73               | `emscripten-forge-dev` |

## Build

```bash
micromamba env create -f environment-dev.yml
micromamba activate cockle
npm install
npm run build
npm run lint:check
```

You can use `conda`, `mamba` or `pixi` instead of `micromamba` here. A copy of
`micromamba` is installed into the `cockle` environment; this is needed to support the
`emscripten-wasm32` platform in the demo and tests.

## Demo

The `cockle` repository includes a demo so that you can easily try it out interactively in a web
browser. Once you have built `cockle`, build the demo using:

```bash
cd demo
npm install
npm run build
```

and then serve he demo using:

```bash
npm run serve
```

and open a browser at the specified URL:

<img alt="Demo" src="demo.png" width="800px">

The demo is served with cross-origin headers so that is supports synchronous `stdin` via both
SharedArrayBuffer and ServiceWorker. Use `cockle-config stdin` to check the current settings, and
`cockle-config stdin sw` to switch to using the ServiceWorker.

The demo can also be served with a local CORS proxy which is useful for trying out `git clone` of
remote repositories. For this use:

```bash
npm run serve-with-cors-proxy
```

---

## Testing

The `test` directory contains unit tests and playwright integration tests which can be built and run
as follows:

```bash
cd test
npm install
npx playwright install --with-deps chromium
npm run build
npm run test
```

You can interactively run individual playwright tests using `npm run test:integration:ui`.
The testing framework serves its own CORS proxy using
[cors-anywhere](https://github.com/Rob--W/cors-anywhere) so that `git clone` of github repositories
can be tested without using an external CORS proxy that may be rate limited or otherwise restricted.

In addition, the `demo` directory contains separate visual tests that can be run in the same way.
Only Linux screenshots are stored within the repository.
