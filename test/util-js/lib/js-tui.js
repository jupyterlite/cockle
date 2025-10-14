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
        enableAlternativeBuffer: ESC + '?1049h',
        disableAlternativeBuffer: ESC + '?1049l',
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

    // Termios settings
    // https://man7.org/linux/man-pages/man3/termios.3.html
    var Termios;
    (function (Termios_1) {
        let InputFlag;
        (function (InputFlag) {
            InputFlag[InputFlag["ISTRIP"] = 32] = "ISTRIP";
            InputFlag[InputFlag["INLCR"] = 64] = "INLCR";
            InputFlag[InputFlag["IGNCR"] = 128] = "IGNCR";
            InputFlag[InputFlag["ICRNL"] = 256] = "ICRNL";
            InputFlag[InputFlag["IUCLC"] = 512] = "IUCLC";
            InputFlag[InputFlag["IXON"] = 1024] = "IXON";
            InputFlag[InputFlag["IXANY"] = 2048] = "IXANY";
            InputFlag[InputFlag["IMAXBEL"] = 8192] = "IMAXBEL";
            InputFlag[InputFlag["IUTF8"] = 16384] = "IUTF8"; // Input is UTF8
        })(InputFlag = Termios_1.InputFlag || (Termios_1.InputFlag = {}));
        let OutputFlag;
        (function (OutputFlag) {
            OutputFlag[OutputFlag["OPOST"] = 1] = "OPOST";
            OutputFlag[OutputFlag["OLCUC"] = 2] = "OLCUC";
            OutputFlag[OutputFlag["ONLCR"] = 4] = "ONLCR";
            OutputFlag[OutputFlag["OCRNL"] = 8] = "OCRNL";
            OutputFlag[OutputFlag["ONOCR"] = 16] = "ONOCR";
            OutputFlag[OutputFlag["ONLRET"] = 32] = "ONLRET";
            OutputFlag[OutputFlag["TABDLY"] = 6144] = "TABDLY"; // Horizontal tab delay mask
        })(OutputFlag = Termios_1.OutputFlag || (Termios_1.OutputFlag = {}));
        let LocalFlag;
        (function (LocalFlag) {
            LocalFlag[LocalFlag["ISIG"] = 1] = "ISIG";
            LocalFlag[LocalFlag["ICANON"] = 2] = "ICANON";
            LocalFlag[LocalFlag["ECHO"] = 8] = "ECHO";
            LocalFlag[LocalFlag["ECHOE"] = 16] = "ECHOE";
            LocalFlag[LocalFlag["ECHOK"] = 32] = "ECHOK";
            LocalFlag[LocalFlag["ECHONL"] = 64] = "ECHONL";
            LocalFlag[LocalFlag["NOFLSH"] = 128] = "NOFLSH";
            LocalFlag[LocalFlag["ECHOCTL"] = 512] = "ECHOCTL";
            LocalFlag[LocalFlag["ECHOPRT"] = 1024] = "ECHOPRT";
            LocalFlag[LocalFlag["ECHOKE"] = 2048] = "ECHOKE";
            LocalFlag[LocalFlag["IEXTEN"] = 32768] = "IEXTEN"; // Enable implementation-defined input processing
        })(LocalFlag = Termios_1.LocalFlag || (Termios_1.LocalFlag = {}));
        (function (ControlCharacter) {
            ControlCharacter[ControlCharacter["VINTR"] = 0] = "VINTR";
            ControlCharacter[ControlCharacter["VQUIT"] = 1] = "VQUIT";
            ControlCharacter[ControlCharacter["VERASE"] = 2] = "VERASE";
            ControlCharacter[ControlCharacter["VKILL"] = 3] = "VKILL";
            ControlCharacter[ControlCharacter["VEOF"] = 4] = "VEOF";
            ControlCharacter[ControlCharacter["VTIME"] = 5] = "VTIME";
            ControlCharacter[ControlCharacter["VMIN"] = 6] = "VMIN";
            ControlCharacter[ControlCharacter["VSWTCH"] = 7] = "VSWTCH";
            ControlCharacter[ControlCharacter["VSTART"] = 8] = "VSTART";
            ControlCharacter[ControlCharacter["VSTOP"] = 9] = "VSTOP";
            ControlCharacter[ControlCharacter["VSUSP"] = 10] = "VSUSP";
            ControlCharacter[ControlCharacter["VEOL"] = 11] = "VEOL";
            ControlCharacter[ControlCharacter["VREPRINT"] = 12] = "VREPRINT";
            ControlCharacter[ControlCharacter["VDISCARD"] = 13] = "VDISCARD";
            ControlCharacter[ControlCharacter["VWERASE"] = 14] = "VWERASE";
            ControlCharacter[ControlCharacter["VLNEXT"] = 15] = "VLNEXT";
            ControlCharacter[ControlCharacter["VEOL2"] = 16] = "VEOL2"; // Yet another EOL character
        })(Termios_1.ControlCharacter || (Termios_1.ControlCharacter = {}));
        function cloneFlags(flags) {
            return {
                c_iflag: flags.c_iflag,
                c_oflag: flags.c_oflag,
                c_cflag: flags.c_cflag,
                c_lflag: flags.c_lflag,
                c_cc: [...flags.c_cc]
            };
        }
        Termios_1.cloneFlags = cloneFlags;
        class Flags {
            c_iflag = 0;
            c_oflag = 0;
            c_cflag = 0;
            c_lflag = 0;
            c_cc = [];
        }
        Termios_1.Flags = Flags;
        class Termios {
            constructor() {
                this.setDefaultShell();
            }
            get() {
                return this._flags;
            }
            // Log to console for debug purposes.
            log(title) {
                const enumHelper = (enumType, name, enumValue) => {
                    const s = [];
                    for (const [k, v] of Object.entries(enumType).filter(([k, v]) => k[0].match(/\D/))) {
                        if ((enumValue & v) > 0) {
                            s.push(k);
                        }
                    }
                    return `  ${name} = ${enumValue} 0x${enumValue.toString(16)} = ${s.join(' ')}`;
                };
                const log = ['Cockle ' + title + ':'];
                const flags = this._flags;
                log.push(enumHelper(InputFlag, 'c_iflag', flags.c_iflag));
                log.push(enumHelper(OutputFlag, 'c_oflag', flags.c_oflag));
                log.push(`  c_cflag = ${flags.c_cflag} 0x${flags.c_cflag.toString(16)}`);
                log.push(enumHelper(LocalFlag, 'c_lflag', flags.c_lflag));
                log.push(`  c_cc = ${flags.c_cc}`);
                console.debug(log.join('\n'));
            }
            set(flags) {
                this._flags = flags;
                this.log('Termios set');
            }
            setDefaultShell() {
                this.setDefaultWasm();
                this._flags.c_oflag |= OutputFlag.ONOCR;
            }
            /**
             * Set termios settings to the default used in WebAssembly commands.
             */
            setDefaultWasm() {
                // This is taken from the default in emscripten-compiled code.
                const flags = this._flags;
                flags.c_iflag = InputFlag.IUTF8 | InputFlag.IMAXBEL | InputFlag.IXON | InputFlag.ICRNL; // 25856 = 0x6500
                flags.c_oflag = OutputFlag.OPOST | OutputFlag.ONLCR; // 5
                flags.c_cflag = 191; // ignored
                flags.c_lflag =
                    LocalFlag.IEXTEN |
                        LocalFlag.ECHOKE |
                        LocalFlag.ECHOCTL |
                        LocalFlag.ECHOK |
                        LocalFlag.ECHOE |
                        LocalFlag.ECHO |
                        LocalFlag.ICANON |
                        LocalFlag.ISIG; // 35387 = 0x8A3B
                flags.c_cc = [
                    3, // VINTR
                    28, // VQUIT
                    127, // VERASE
                    21, // VKILL
                    4, // VEOF
                    0, // VTIME
                    1, // VMIN
                    0, // VSWTCH
                    17, // VSTART
                    19, // VSTOP
                    26, // VSUSP
                    0, // VEOL
                    18, // VREPRINT
                    15, // VDISCARD
                    23, // VWERASE
                    22, // VLNEXT
                    0, // VEOL2
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    0
                ];
            }
            setRawMode() {
                // Assume is currently default shell termios.
                const flags = this._flags;
                flags.c_iflag &= ~(InputFlag.ISTRIP |
                    InputFlag.INLCR |
                    InputFlag.IGNCR |
                    InputFlag.ICRNL |
                    InputFlag.IXON);
                flags.c_oflag &= ~OutputFlag.OPOST;
                flags.c_lflag &= ~(LocalFlag.ECHO |
                    LocalFlag.ECHONL |
                    LocalFlag.ICANON |
                    LocalFlag.ISIG |
                    LocalFlag.IEXTEN);
            }
            _flags = new Flags();
        }
        Termios_1.Termios = Termios;
    })(Termios || (Termios = {}));

    async function run(context) {
        const { name, stdin, stdout, termios } = context;
        if (!stdout.supportsAnsiEscapes()) {
            context.stderr.write(`${name} aborting, stdout is not a tty`);
            return ExitCode.GENERAL_ERROR;
        }
        // Disable canonical mode (buffered I/O) and echo from stdin to stdout.
        const oldTermios = termios.get();
        const newTermios = Termios.cloneFlags(oldTermios);
        newTermios.c_lflag &= ~Termios.LocalFlag.ICANON & ~Termios.LocalFlag.ECHO;
        try {
            termios.set(newTermios);
            stdout.write(ansi.enableAlternativeBuffer);
            let useColor = true;
            let text = '';
            let stop = false;
            while (!stop) {
                await render(context, useColor, text);
                const input = await stdin.readAsync(null);
                if (input.length < 1 || input[0] === '\x04') {
                    stop = true;
                }
                else {
                    text += input;
                    useColor = !useColor;
                }
            }
        }
        finally {
            stdout.write(ansi.disableAlternativeBuffer);
            termios.set(oldTermios);
        }
        return ExitCode.SUCCESS;
    }
    async function render(context, useColor, text) {
        const { stdout } = context;
        stdout.write(ansi.eraseScreen);
        stdout.write(ansi.cursorHome);
        const prefix = useColor ? ansi.styleBrightBlue : '';
        const suffix = useColor ? ansi.styleReset : '';
        stdout.write(prefix + 'Hello: ' + text + suffix);
    }

    exports.run = run;

    return exports;

})({});
