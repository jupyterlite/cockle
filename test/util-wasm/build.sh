#!/bin/bash

set -eux

names=(check_termios wasm-test)

for name in ${names[@]}; do
    emcc \
        -Os \
        -sALLOW_MEMORY_GROWTH=1 \
        -sEXIT_RUNTIME=1 \
        -sEXPORTED_RUNTIME_METHODS=FS,ENV,TTY \
        -sFORCE_FILESYSTEM=1 \
        -sMODULARIZE=1 \
        $name.c \
        -o wasm/$name.js
done
