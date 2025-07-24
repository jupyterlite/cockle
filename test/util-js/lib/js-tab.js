var Module = (function (exports) {
    'use strict';

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
        }
        get isSet() {
            return this._isSet;
        }
        get name() {
            return this.shortName ? this.shortName : this.longName;
        }
        get prefixedName() {
            return this.shortName ? `-${this.shortName}` : `--${this.longName}`;
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
    class PositionalPathsArguments extends PositionalArguments {
        options;
        constructor(options = {}) {
            super(options);
            this.options = options;
        }
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
            // Dynamically create help text from arguments.
            for (const [key, arg] of Object.entries(this)) {
                if (key === 'subcommands') {
                    break;
                }
                const name = arg.prefixedName;
                const spaces = Math.max(1, 12 - name.length);
                yield `    ${name}${' '.repeat(spaces)}${arg.description}`;
            }
            if ('subcommands' in this) {
                const subcommands = this['subcommands'];
                yield '';
                yield 'subcommands:';
                for (const sub of Object.values(subcommands)) {
                    const spaces = Math.max(1, 12 - sub.name.length);
                    yield `    ${sub.name}${' '.repeat(spaces)}${sub.description}`;
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
                        const shortName = arg.slice(1);
                        args = this._findByShortName(shortName).parse(arg, args);
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
            const { args } = context;
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
                        return subcommand._parseToTabComplete({ ...context, args: [arg, ...args] });
                    }
                }
                if (arg.startsWith('-')) {
                    if (lastArg) {
                        const longNamePossibles = Object.keys(this._longNameArguments).map(x => '--' + x);
                        if (arg.startsWith('--')) {
                            return { possibles: longNamePossibles };
                        }
                        else {
                            const shortNamePossibles = Object.keys(this._shortNameArguments).map(x => '-' + x);
                            return { possibles: shortNamePossibles.concat(longNamePossibles) };
                        }
                    }
                }
                else if (positional !== undefined) {
                    // Jump straight to last argument as the preceding ones are independent of it.
                    if (positional instanceof PositionalPathsArguments) {
                        return { pathType: positional.options.pathType ?? PathType.Any };
                    }
                    else {
                        const possiblesCallback = positional.options.possibles;
                        if (possiblesCallback !== undefined) {
                            return { possibles: possiblesCallback({ ...context, args: [arg, ...args] }) };
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
    }

    /**
     * The same functionality as js-test but using Options and tabComplete.
     */
    class TestArguments extends CommandArguments {
        positional = new PositionalArguments({
            possibles: (context) => [
                'color',
                'environment',
                'exitCode',
                'name',
                'readfile',
                'stderr',
                'stdin',
                'stdout',
                'writefile'
            ]
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
            const useColor = stdout.supportsAnsiEscapes();
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
