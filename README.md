# cockle

In-browser bash-like shell implemented in a combination of TypeScript and WebAssembly.

Used in the [JupyterLite terminal extension](https://github.com/jupyterlite/terminal).

This is an early-stage work in progress and should be considered experimental code. Anything and
everything could change at any time.

The commands used here are either built-in commands implemented in TypeScript, or WebAssembly
commands compiled into .js and .wasm files. The latter are built by
[Emscripten-forge](https://emscripten-forge.org/) and are added to the `cockle` NPM package using
a `micromamba` environment as part of the `npm prepack` process.

## Build

```bash
micromamba env create -f environment-dev.yml -y
micromamba activate cockle
npm install
npm run fetch:wasm
npm run build
npm run lint:check
```

## Run tests

```bash
cd test
npm install
npx playwright install --with-deps chromium
npm run build
npm run test
npm run test:report
```

You can interactively run individual tests using `npm run test:ui`.

## Demo

The `cockle` repository includes a demo so that you can easily try it out interactively in a web
browser. Once you have built `cockle`, build and run the demo using:

```bash
cd demo
npm install
npm run build
npm run serve
```

then open a browser at the specified URL:

<img alt="Demo" src="demo.png" width="500px">
