var Module = (function (exports) {
    'use strict';

    /**
     * ANSI escape sequences.
     */
    const ESC = '\x1B[';
    // eslint-disable-next-line no-control-regex
    const styleRegex = /\x1b\[[^m]*m/g;
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
        removeStyles: (str) => str.replace(styleRegex, ''),
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

    class ErrorExitCode extends Error {
        exitCode;
        constructor(exitCode, message) {
            super(message);
            this.exitCode = exitCode;
        }
    }
    class GeneralError extends ErrorExitCode {
        constructor(message) {
            super(ExitCode.GENERAL_ERROR, message);
        }
    }

    /**
     * Individual command argument classes.
     */
    class Argument {
        shortName;
        longName;
        description;
        constructor(shortName, longName, description) {
            this.shortName = shortName;
            this.longName = longName;
            this.description = description;
            if (!(shortName.length === 0 || shortName.length === 1)) {
                throw new GeneralError(`Argument shortName ${shortName} must be a string of length 1`);
            }
            if (!(longName.length === 0 || longName.length > 1)) {
                throw new GeneralError(`Argument longName ${longName} must be a string of length greater than 1`);
            }
        }
        get isSet() {
            return this._isSet;
        }
        /**
         * Parse remaining args and return those args not consumed.
         */
        parse(currentArg, args) {
            this.set();
            return args;
        }
        set() {
            this._isSet = true;
        }
        _isSet = false;
    }
    /**
     * A collection of position arguments.
     * Greedily consumes all remaining arguments as strings.
     */
    class PositionalArguments extends Argument {
        options;
        constructor(options = {}) {
            super('', '', '');
            this.options = options;
            const { max, min } = options;
            if (min !== undefined) {
                if (min < 0) {
                    throw new GeneralError('Negative min for positional arguments');
                }
                if (max !== undefined && max < min) {
                    throw new GeneralError('max must be greater than min for positional arguments');
                }
            }
        }
        get length() {
            return this._strings.length;
        }
        /**
         * Parse remaining args. This will consume all the args, throwing an error if there are any args
         * of an incorrect form.
         */
        parse(currentArg, args) {
            this._strings.push(currentArg);
            this.set();
            for (const arg of args) {
                if (arg.startsWith('-')) {
                    throw new GeneralError('Cannot have named argument after positional arguments');
                }
                this._strings.push(arg);
            }
            return [];
        }
        get strings() {
            return this._strings;
        }
        _strings = [];
    }
    class PositionalPathArguments extends PositionalArguments {
        options;
        constructor(options = {}) {
            super(options);
            this.options = options;
        }
    }

    /**
     * Trim whitespace from end of string.
     */
    function rtrim(text) {
        return text.replace(/\s+$/, '');
    }

    /**
     * Type of horizontal spacer, such as between the header and rows.
     */
    var HorizontalSpacerType;
    (function (HorizontalSpacerType) {
        HorizontalSpacerType[HorizontalSpacerType["TOP"] = 0] = "TOP";
        HorizontalSpacerType[HorizontalSpacerType["MIDDLE"] = 1] = "MIDDLE";
        HorizontalSpacerType[HorizontalSpacerType["BOTTOM"] = 2] = "BOTTOM";
    })(HorizontalSpacerType || (HorizontalSpacerType = {}));
    /**
     * Type of vertical spacer used between adjacent columns in the same row.
     */
    var VerticalSpacerType;
    (function (VerticalSpacerType) {
        VerticalSpacerType[VerticalSpacerType["LEFT"] = 0] = "LEFT";
        VerticalSpacerType[VerticalSpacerType["INNER"] = 1] = "INNER";
        VerticalSpacerType[VerticalSpacerType["RIGHT"] = 2] = "RIGHT";
    })(VerticalSpacerType || (VerticalSpacerType = {}));
    /**
     * Abstract base class for table which displays a 2D grid of headers and rows with each column sized
     * to fit its longest item. The number of columns is given by the maximum number of items in all
     * rows ahd header rows; rows with fewer items are right-padded with empty strings. It does not
     * care about terminal width or height, so may overrun in width and take up more than page.
     */
    class BaseTable {
        options;
        constructor(options) {
            this.options = options;
        }
        addHeaderRow(headerRow) {
            this._headerRows.push(headerRow);
            this._updateColumnWidths(headerRow);
        }
        addRow(row) {
            this._rows.push(row);
            this._updateColumnWidths(row);
        }
        /**
         * Return a default colorByColumn map for clients that want to color columns but don't want to
         * define their own.
         */
        static defaultColorByColumn() {
            return new Map([
                [1, ansi.styleBrightBlue],
                [2, ansi.styleBrightPurple],
                [3, ansi.styleGreen],
                [4, ansi.styleYellow]
            ]);
        }
        /**
         * Generator for output lines, one at a time.
         * @param prefix String to insert at beginning of each line, default ''.
         * @param suffix String to append to end of each line, default ''.
         */
        *lines(prefix = '', suffix = '') {
            const { sortByColumn } = this.options;
            if (sortByColumn !== undefined) {
                // Sort rows in place.
                const compareColumn = (columnIndex, a, b) => {
                    const sortColumn = sortByColumn[columnIndex];
                    if (a[sortColumn] < b[sortColumn]) {
                        return -1;
                    }
                    else if (a[sortColumn] > b[sortColumn]) {
                        return 1;
                    }
                    else if (sortByColumn.length > columnIndex + 1) {
                        // This column matches, sort by next column.
                        return compareColumn(columnIndex + 1, a, b);
                    }
                    return 0;
                };
                this._rows.sort((a, b) => compareColumn(0, a, b));
            }
            const nColumns = this._columnWidths.length;
            const topSpacer = this.horizontalSpacer(HorizontalSpacerType.TOP);
            if (topSpacer !== undefined) {
                yield prefix + rtrim(topSpacer) + suffix;
            }
            for (const headerRow of this._headerRows) {
                let line = '';
                for (let i = 0; i < nColumns; i++) {
                    line += this.verticalSpacer(i === 0 ? VerticalSpacerType.LEFT : VerticalSpacerType.INNER);
                    const item = headerRow[i] ?? '';
                    line += item + ' '.repeat(this._columnWidths[i] - this._cleanString(item).length);
                }
                line += this.verticalSpacer(VerticalSpacerType.RIGHT);
                yield prefix + rtrim(line) + suffix;
            }
            if (this._headerRows.length > 0) {
                const middleSpacer = this.horizontalSpacer(HorizontalSpacerType.MIDDLE);
                if (middleSpacer !== undefined) {
                    yield prefix + rtrim(middleSpacer) + suffix;
                }
            }
            for (const row of this._rows) {
                let line = '';
                for (let i = 0; i < nColumns; i++) {
                    line += this.verticalSpacer(i === 0 ? VerticalSpacerType.LEFT : VerticalSpacerType.INNER);
                    const item = row[i] ?? '';
                    if (item) {
                        const color = this.options.colorByColumn?.get(i);
                        line += color !== undefined ? color + item + ansi.styleReset : item;
                    }
                    line += ' '.repeat(this._columnWidths[i] - this._cleanString(item).length);
                }
                line += this.verticalSpacer(VerticalSpacerType.RIGHT);
                yield prefix + rtrim(line) + suffix;
            }
            const bottomSpacer = this.horizontalSpacer(HorizontalSpacerType.BOTTOM);
            if (bottomSpacer !== undefined) {
                yield prefix + rtrim(bottomSpacer) + suffix;
            }
        }
        /**
         * Returns number of rows in body of table. Does not include header rows.
         */
        get rowCount() {
            return this._rows.length;
        }
        /**
         * Write table to output.
         * @param output Output to write to.
         * @param prefix String to insert at beginning of each line, default ''.
         * @param suffix String to append to end of each line, default '\n'.
         */
        write(output, prefix = '', suffix = '\n') {
            for (const line of this.lines(prefix, suffix)) {
                output.write(line);
            }
        }
        _cleanString(str) {
            return ansi.removeStyles(str);
        }
        _updateColumnWidths(row) {
            const widths = row.map(str => this._cleanString(str).length);
            const n = Math.min(this._columnWidths.length, widths.length);
            for (let i = 0; i < n; i++) {
                this._columnWidths[i] = Math.max(this._columnWidths[i], widths[i]);
            }
            if (widths.length > n) {
                this._columnWidths.push(...widths.slice(n));
            }
        }
        _columnWidths = [];
        _headerRows = [];
        _rows = [];
    }
    /**
     * Simple table with horizontal line between header and rows such as:
     *
     * header1  header2
     * ────────────────
     * aaaa     bbb
     * cc       dd
     */
    class Table extends BaseTable {
        constructor(options = {}) {
            super(options);
            const separatorSize = options.spacerSize ?? 2;
            this._spacer = ' '.repeat(separatorSize);
            this._spacersAtEnds = options.spacersAtEnds ?? false;
        }
        horizontalSpacer(type) {
            if (type === HorizontalSpacerType.MIDDLE) {
                const totalWidth = this._columnWidths.reduce((acc, value) => acc + value) + this._totalSeparatorSize();
                return '─'.repeat(totalWidth);
            }
            return undefined;
        }
        verticalSpacer(type) {
            if (type === VerticalSpacerType.INNER || this._spacersAtEnds) {
                return this._spacer;
            }
            return '';
        }
        _totalSeparatorSize() {
            let nSpacers = this._columnWidths.length - 1;
            if (this._spacersAtEnds) {
                nSpacers += 2;
            }
            return nSpacers * this._spacer.length;
        }
        _spacer;
        _spacersAtEnds;
    }

    /**
     * Enum to find possible matching file and/or directory names.
     */
    var PathType;
    (function (PathType) {
        PathType[PathType["Any"] = 0] = "Any";
        PathType[PathType["Directory"] = 1] = "Directory";
        PathType[PathType["File"] = 2] = "File";
    })(PathType || (PathType = {}));

    /**
     * Arguments for a command, used by builtin, external and javascript commands.
     */
    class CommandArguments {
        parse(args) {
            // Use copy of args to avoid modifying caller's args.
            this._parseToRun(args.slice());
            return this;
        }
        async tabComplete(context) {
            // Use copy of args to avoid modifying caller's args.
            const contextWithArgsCopy = {
                ...context,
                args: context.args.slice()
            };
            const result = await this._parseToTabComplete(contextWithArgsCopy);
            if (result.possibles) {
                result.possibles = result.possibles.filter(name => name.startsWith(context.args.at(-1)));
            }
            return result;
        }
        writeHelp(output) {
            for (const line of this._help()) {
                output.write(`${line}\n`);
            }
        }
        _findByLongName(longName) {
            const longNameArguments = this._longNameArguments;
            if (longName in longNameArguments) {
                return longNameArguments[longName];
            }
            else {
                // Need better error reporting
                throw new GeneralError(`No such longName argument '${longName}'`);
            }
        }
        _findByShortName(shortName) {
            const shortNameArguments = this._shortNameArguments;
            if (shortName in shortNameArguments) {
                return shortNameArguments[shortName];
            }
            else {
                // Need better error reporting
                throw new GeneralError(`No such shortName argument '${shortName}'`);
            }
        }
        *_help() {
            // Emit description first if present.
            if (this.description) {
                yield this.description;
            }
            // Dynamically create help text from arguments.
            const optionsTable = new Table({ spacerSize: 3 });
            for (const arg of Object.values(this)) {
                if (arg instanceof Argument) {
                    const { longName, shortName } = arg;
                    if (longName || shortName) {
                        let names = shortName ? `-${shortName}` : '  ';
                        if (longName) {
                            names += (shortName ? ', ' : '  ') + `--${longName}`;
                        }
                        optionsTable.addRow([names, arg.description]);
                    }
                }
            }
            if (optionsTable.rowCount > 0) {
                yield '';
                yield 'options:';
                yield* optionsTable.lines('    ');
            }
            if (this.subcommands !== undefined) {
                const table = new Table({ spacerSize: 3 });
                for (const sub of Object.values(this.subcommands)) {
                    table.addRow([sub.name, sub.description]);
                }
                if (table.rowCount > 0) {
                    yield '';
                    yield 'subcommands:';
                    yield* table.lines('    ');
                }
            }
        }
        get _longNameArguments() {
            const args = Object.values(this).filter(arg => arg instanceof Argument && 'longName' in arg && arg.longName.length > 0);
            return Object.fromEntries(args.map(arg => [arg.longName, arg]));
        }
        /**
         * Parse arguments to run a command.
         */
        _parseToRun(args) {
            const { positional } = this;
            let inPositional = false;
            const subcommands = this.subcommands ?? {};
            let firstArg = true;
            while (args.length > 0) {
                const arg = args.shift();
                if (firstArg && arg in subcommands) {
                    const subcommand = subcommands[arg];
                    subcommand.set();
                    subcommand.parse(args);
                    break;
                }
                else if (arg.startsWith('-') && arg.length > 1) {
                    if (inPositional) {
                        throw new GeneralError('Cannot have named argument after positional arguments');
                    }
                    if (arg.startsWith('--')) {
                        const longName = arg.slice(2);
                        args = this._findByLongName(longName).parse(arg, args);
                    }
                    else {
                        // One or more shortName arguments.
                        for (const shortName of arg.slice(1).split('')) {
                            args = this._findByShortName(shortName).parse(arg, args);
                            // if consumed further args, what to do?
                        }
                    }
                }
                else if (positional !== undefined) {
                    inPositional = true;
                    args = positional.parse(arg, args);
                }
                else {
                    throw new GeneralError(`Unrecognised argument: '${arg}'`);
                }
                firstArg = false;
            }
            if (positional !== undefined) {
                // `positional` should handle its own validation here.
                const { min, max } = positional.options;
                if (min !== undefined && positional.length < min) {
                    throw new GeneralError('Insufficient positional arguments');
                }
                if (max !== undefined && positional.length > max) {
                    throw new GeneralError('Too many positional arguments');
                }
            }
        }
        /**
         * Parse arguments to tab complete the final one.
         */
        async _parseToTabComplete(context) {
            let { args } = context;
            const { positional } = this;
            const subcommands = this.subcommands ?? {};
            let firstArg = true;
            while (args.length > 0) {
                const arg = args.shift();
                const lastArg = args.length === 0;
                if (firstArg && subcommands) {
                    if (lastArg) {
                        const possibles = Object.keys(subcommands).filter(name => name.startsWith(arg));
                        if (possibles.length > 0) {
                            return { possibles };
                        }
                    }
                    if (arg in subcommands) {
                        // Exact match, parse it.
                        const subcommand = subcommands[arg];
                        subcommand.set();
                        return await subcommand.tabComplete(context);
                    }
                }
                if (arg.startsWith('-')) {
                    if (lastArg) {
                        const longNamePossibles = Object.keys(this._longNameArguments).map(x => '--' + x);
                        if (arg.startsWith('--')) {
                            return { possibles: longNamePossibles };
                        }
                        else if (arg.length > 2) {
                            return {};
                        }
                        else {
                            const shortNamePossibles = Object.keys(this._shortNameArguments).map(x => '-' + x);
                            return { possibles: shortNamePossibles.concat(longNamePossibles) };
                        }
                    }
                    else {
                        // Usual parsing of short or long name argument.
                        if (arg.startsWith('--')) {
                            const longName = arg.slice(2);
                            args = this._findByLongName(longName).parse(arg, args);
                        }
                        else {
                            // One or more shortName arguments.
                            for (const shortName of arg.slice(1).split('')) {
                                args = this._findByShortName(shortName).parse(arg, args);
                                // if consumed further args, what to do?
                            }
                        }
                    }
                }
                else if (positional !== undefined) {
                    // Jump straight to last argument as the preceding ones are independent of it.
                    if (positional instanceof PositionalPathArguments) {
                        return { pathType: positional.options.pathType ?? PathType.Any };
                    }
                    else {
                        const tabCompleteCallback = positional.options.tabComplete;
                        if (tabCompleteCallback !== undefined) {
                            return await tabCompleteCallback({ ...context, args: [arg, ...args] });
                        }
                    }
                }
                firstArg = false;
            }
            return {};
        }
        get _shortNameArguments() {
            const args = Object.values(this).filter(arg => arg instanceof Argument && 'shortName' in arg && arg.shortName.length > 0);
            return Object.fromEntries(args.map(arg => [arg.shortName, arg]));
        }
        positional;
        subcommands;
        description;
    }

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

    /**
     * The same functionality as js-test but using Options and tabComplete.
     */
    class TestArguments extends CommandArguments {
        positional = new PositionalArguments({
            tabComplete: async (context) => ({
                possibles: [
                    'color',
                    'environment',
                    'exitCode',
                    'name',
                    'readfile',
                    'shellId',
                    'size',
                    'stderr',
                    'stdin',
                    'stdinchar',
                    'stdout',
                    'writefile'
                ]
            })
        });
    }
    async function run(context) {
        const args = new TestArguments().parse(context.args).positional.strings;
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
            const { stdout } = context;
            const useColor = stdout.isTerminal();
            for (let j = 0; j < 16; j++) {
                let line = '';
                for (let i = 0; i < 32; i++) {
                    // r,g,b in range 0 to 255 inclusive.
                    const r = (i + 1) * 8 - 1;
                    const g = 128;
                    const b = (j + 1) * 16 - 1;
                    if (useColor) {
                        line += `\x1b[38;2;${r};${g};${b}m`; // RGB color.
                    }
                    line += String.fromCharCode(65 + i);
                    if (useColor) {
                        line += '\x1b[1;0m'; // Reset color.
                    }
                }
                stdout.write(line + '\n');
            }
        }
        if (args.includes('stdin')) {
            // Read until EOT, echoing back as upper case. Line buffering.
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
        if (args.includes('stdinchar')) {
            // Read until EOT, echoing back as upper case. Char buffering.
            const { stdin, stdout, termios } = context;
            const oldTermios = termios.get();
            const newTermios = Termios.cloneFlags(oldTermios);
            newTermios.c_lflag &= ~Termios.LocalFlag.ICANON;
            termios.set(newTermios);
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
            termios.set(oldTermios);
        }
        if (args.includes('readfile')) {
            // Read from file and echo content to stdout.
            const { FS } = context.fileSystem;
            const filename = 'readfile.txt';
            try {
                // Exception thrown here will be handled by JavaScriptCommandRunner, but can provide more
                // precise error information here.
                const content = FS.readFile(filename, { encoding: 'utf8' });
                context.stdout.write(content);
            }
            catch {
                context.stderr.write(`Unable to open file ${filename} for reading`);
                return ExitCode.GENERAL_ERROR;
            }
        }
        if (args.includes('writefile')) {
            const { FS } = context.fileSystem;
            const filename = 'writefile.txt';
            try {
                // Exception thrown here will be handled by JavaScriptCommandRunner, but can provide more
                // precise error information here.
                FS.writeFile(filename, 'File written by js-tab');
            }
            catch {
                context.stderr.write(`Unable to open file ${filename} for writing`);
                return ExitCode.GENERAL_ERROR;
            }
        }
        if (args.includes('shellId')) {
            context.stdout.write(`shellId: ${context.shellId}\n`);
        }
        if (args.includes('size')) {
            const size = context.size();
            context.stdout.write(`size: rows ${size[0]} x columns ${size[1]}\n`);
        }
        if (args.includes('exitCode')) {
            return ExitCode.GENERAL_ERROR;
        }
        return ExitCode.SUCCESS;
    }
    async function tabComplete(context) {
        return await new TestArguments().tabComplete(context);
    }

    exports.run = run;
    exports.tabComplete = tabComplete;

    return exports;

})({});
