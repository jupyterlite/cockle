# cockle

In-browser bash-like shell implemented in a combination of TypeScript and WebAssembly.

Used in the [JupyterLite terminal extension](https://github.com/jupyterlite/terminal).

The commands used here are either built-in commands implemented in TypeScript, or WebAssembly
commands compiled into .js and .wasm files. The latter are built by
[Emscripten-forge](https://emscripten-forge.org/) and are added to the `cockle` NPM package using
a `micromamba` environment as part of the `npm prepack` process.

To build:

```bash
micromamba env create -f environment-dev.yml -y
micromamba activate cockle
npm install
npm run fetch:wasm
npm run build
npm run lint:check
```

To run tests:

```bash
cd test
npm install
npx playwright install --with-deps chromium
npm run build
npm run test
npm run test:report
```

You can interactively run individual tests using `npm run test:ui`.
