#!/bin/bash

set -eux

emcc \
    -Os \
    --minify=0 \
    -sALLOW_MEMORY_GROWTH=1 \
    -sENVIRONMENT=web,worker \
    -sEXPORTED_RUNTIME_METHODS=FS,ENV,getEnvStrings,TTY \
    -sFORCE_FILESYSTEM=1 \
    -sMODULARIZE=1 \
    check_termios.c \
    -o wasm/check_termios.js
