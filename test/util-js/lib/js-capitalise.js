var Module = (function (exports) {
    'use strict';

    const ExitCode = {
        GENERAL_ERROR: 1};

    async function run(cmdName, context) {
        const { args, stdout } = context;
        stdout.write(cmdName + ': ' + args.map(arg => arg.toUpperCase()).join(','));
        return ExitCode.GENERAL_ERROR;
    }

    exports.run = run;

    return exports;

})({});
