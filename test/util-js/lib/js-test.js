var Module = (function (exports) {
    'use strict';

    const ExitCode = {
        SUCCESS: 0};

    async function run(context) {
        const { args, name, stdout } = context;
        stdout.write(name + ': ' + args.join(','));
        return ExitCode.SUCCESS;
    }

    exports.run = run;

    return exports;

})({});
