var Module = (function (exports) {
    'use strict';

    /**
     * ANSI escape sequences.
     */
    const ESC = '\x1B[';
    const ansi = {
        styleReset: ESC + '1;0m',
        styleBrightBlue: ESC + '0;94m',
        styleBrightPurple: ESC + '0;95m',
        styleGreen: ESC + '0;32m',
        styleYellow: ESC + '0;33m'};

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
                    line += item + ' '.repeat(this._columnWidths[i] - item.length);
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
                    line += ' '.repeat(this._columnWidths[i] - item.length);
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
        _updateColumnWidths(row) {
            const widths = row.map(str => str.length);
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
                    'stderr',
                    'stdin',
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
