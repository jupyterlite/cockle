# util-wasm

Utilities that are compiled to wasm and used in testing.

This directory includes the C source code, and compiled output is in the wasm directory and is
checked into git so that it does not have to be recompiled for testing.

If the source code is modified or the version of emscripten used to compile needs to change, then
the C files will need to be recompiled. The recommended process to recompile is to use an
[emsdk docker image](https://hub.docker.com/r/emscripten/emsdk) as follows:

```bash
docker pull emscripten/emsdk:4.0.9
```

then from this directory:

```bash
docker run -v $PWD:/src -it emscripten/emsdk:4.0.9 bash
```

In the docker image:

```bash
./build.sh
```

which will build new `.js` and `.wasm` files in the `wasm` directory.

Alternatively install and activate the appropriate version of the
[emsdk](https://github.com/emscripten-core/emsdk)
