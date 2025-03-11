var Module = (function (exports) {
    'use strict';

    const ExitCode = {
        SUCCESS: 0};

    async function run(cmdName, context) {
        const { args, stdout } = context;
        stdout.write(cmdName + ': ' + args.join(','));
        return ExitCode.SUCCESS;
    }

    exports.run = run;

    return exports;

})({});
