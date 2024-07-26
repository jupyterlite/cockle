# cockle

In-browser bash-like shell implemented in a combination of TypeScript and WebAssembly.

Used in the [JupyterLite terminal extension](https://github.com/jupyterlite/terminal).

To build:

```bash
npm install
npm run build
npm run lint:check
```

To run tests:

```bash
cd test
npm install
npm run build
npm run test
npm run test:report
```

You can interactively run individual tests using `npm run test:ui`.
