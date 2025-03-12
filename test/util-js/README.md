# util-js

JavaScript commands used in testing.

TypeScript source code is in the `src` directory and compiled JavaScript in the `lib` directory.
These commands need to be rebuilt whenever there is a change to their source code or to the API
exported by `cockle` for such commands, using:

```bash
npm install
npm run build
```
