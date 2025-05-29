var Module = (function (exports) {
    'use strict';

    const ExitCode = {
        SUCCESS: 0};

    async function run(context) {
        const { stdin, stdout } = context;
        // Read from stdin a character at a time and write it back capitalised until no further input is
        // available or EOT (ascii 4, Ctrl-C) is read.
        let stop = false;
        while (!stop) {
            const chars = await stdin.readAsync(null);
            if (chars.length === 0 || chars.endsWith('\x04')) {
                stop = true;
            }
            else {
                stdout.write(chars.toUpperCase());
            }
        }
        return ExitCode.SUCCESS;
    }

    exports.run = run;

    return exports;

})({});
