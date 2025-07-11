var Module = (function (exports) {
    'use strict';

    /**
     * ANSI escape sequences.
     */
    const ESC = '\x1B[';
    function clamp(n) {
        return Math.min(Math.max(Math.round(n), 0), 255);
    }
    const ansi = {
        cursorUp: (count = 1) => (count > 0 ? ESC + count + 'A' : ''),
        cursorDown: (count = 1) => (count > 0 ? ESC + count + 'B' : ''),
        cursorRight: (count = 1) => (count > 0 ? ESC + count + 'C' : ''),
        cursorLeft: (count = 1) => (count > 0 ? ESC + count + 'D' : ''),
        cursorHome: ESC + 'H',
        eraseScreen: ESC + '2J',
        eraseSavedLines: ESC + '3J',
        eraseEndLine: ESC + 'K',
        eraseStartLine: ESC + '1K',
        styleRGB: (r, g, b, foreground = true) => {
            const code = foreground ? '38' : '48';
            return `${ESC}${code};2;${clamp(r)};${clamp(g)};${clamp(b)}m`;
        },
        styleReset: ESC + '1;0m',
        styleBoldRed: ESC + '1;31m',
        styleBoldGreen: ESC + '1;32m',
        styleBrightRed: ESC + '0;91m',
        styleBrightGreen: ESC + '0;92m',
        styleBrightYellow: ESC + '0;93m',
        styleBrightBlue: ESC + '0;94m',
        styleBrightPurple: ESC + '0;95m',
        styleBrightCyan: ESC + '0;96m',
        styleRed: ESC + '0;31m',
        styleGreen: ESC + '0;32m',
        styleYellow: ESC + '0;33m',
        styleBlue: ESC + '0;34m',
        stylePurple: ESC + '0;35m',
        styleCyan: ESC + '0;36m',
        showCursor: ESC + '?25h',
        hideCursor: ESC + '?25l'
    };

    const ExitCode = {
        SUCCESS: 0,
        GENERAL_ERROR: 1};

    async function run(context) {
        const { args } = context;
        if (args.includes('environment')) {
            context.environment.set('TEST_JS_VAR', '123');
            context.environment.delete('TEST_JS_VAR2');
        }
        if (args.includes('name')) {
            context.stdout.write(context.name + '\n');
        }
        if (args.includes('stdout')) {
            context.stdout.write('Output line 1\n');
            context.stdout.write('Output line 2\n');
        }
        if (args.includes('stderr')) {
            context.stderr.write('Error message\n');
        }
        if (args.includes('color')) {
            for (let j = 0; j < 16; j++) {
                let line = '';
                for (let i = 0; i < 32; i++) {
                    const rgb = ansi.styleRGB((i + 1) * 8 - 1, 128, (j + 1) * 16 - 1);
                    line += rgb + String.fromCharCode(65 + i) + ansi.styleReset;
                }
                context.stdout.write(line + '\n');
            }
        }
        if (args.includes('stdin')) {
            // Read until EOT, echoing back as upper case.
            const { stdin, stdout } = context;
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
        }
        if (args.includes('exitCode')) {
            return ExitCode.GENERAL_ERROR;
        }
        return ExitCode.SUCCESS;
    }

    exports.run = run;

    return exports;

})({});
