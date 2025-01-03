#!/bin/bash

set -eux

names=(check_termios local-cmd)

for name in ${names[@]}; do
    emcc \
        -Os \
        --minify=0 \
        -sALLOW_MEMORY_GROWTH=1 \
        -sEXPORTED_RUNTIME_METHODS=FS,ENV,getEnvStrings,TTY \
        -sFORCE_FILESYSTEM=1 \
        -sMODULARIZE=1 \
        $name.c \
        -o wasm/$name.js
done
