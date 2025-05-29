var Module = (function (exports) {
    'use strict';

    const ExitCode = {
        GENERAL_ERROR: 1};

    async function run(context) {
        const { args, name, stdout } = context;
        stdout.write(name + ': ' + args.map(arg => arg.toUpperCase()).join(','));
        return ExitCode.GENERAL_ERROR;
    }

    exports.run = run;

    return exports;

})({});
