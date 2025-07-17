import { BuiltinCommand } from './builtin_command';
import { BooleanOption, TrailingStringsOption } from './option';
import { Options, Subcommand } from './options';
import { IContext } from '../context';
import { GeneralError } from '../error_exit_code';
import { ExitCode } from '../exit_code';
import { BorderTable } from '../layout';
import { ITabCompleteContext, ITabCompleteResult } from '../tab_complete';
import { COCKLE_VERSION } from '../version';

class CommandSubcommand extends Subcommand {
  trailingStrings = new TrailingStringsOption();
}

class ModuleSubcommand extends Subcommand {
  trailingStrings = new TrailingStringsOption();
}

class PackageSubcommand extends Subcommand {
  trailingStrings = new TrailingStringsOption();
}

class StdinSubcommand extends Subcommand {
  trailingStrings = new TrailingStringsOption({ max: 1 });
}

class CockleConfigOptions extends Options {
  version = new BooleanOption('v', 'version', 'show cockle version');
  help = new BooleanOption('h', 'help', 'display this help and exit');
  subcommands = {
    command: new CommandSubcommand('command', 'show command information'),
    module: new ModuleSubcommand('module', 'show module information'),
    package: new PackageSubcommand('package', 'show package information'),
    stdin: new StdinSubcommand('stdin', 'synchronous stdin configuration')
  };
}

export class CockleConfigCommand extends BuiltinCommand {
  get name(): string {
    return 'cockle-config';
  }

  async tabComplete(context: ITabCompleteContext): Promise<ITabCompleteResult> {
    const { args } = context;

    if (args.length === 1) {
      const options = new CockleConfigOptions();
      let possibles = Object.keys(options.subcommands);
      if (args[0]) {
        possibles = possibles.filter(name => name.startsWith(args[0]));
      }
      return { possibles };
    }

    return {};
  }

  protected async _run(context: IContext): Promise<number> {
    const { args, environment, stdout } = context;
    const options = new CockleConfigOptions().parse(args);
    const { subcommands } = options;

    if (options.help.isSet) {
      options.writeHelp(stdout);
      return ExitCode.SUCCESS;
    }

    const colorByColumn =
      stdout.supportsAnsiEscapes() && environment.color
        ? BorderTable.defaultColorByColumn()
        : undefined;

    const showAll = args.length === 0;
    if (showAll || options.version.isSet) {
      this._writeVersion(context);
    }
    if (showAll || subcommands.stdin.isSet) {
      this._writeOrSetSyncStdinConfig(
        context,
        colorByColumn,
        subcommands.stdin.trailingStrings.strings.at(0)
      );
    }
    if (showAll || subcommands.package.isSet) {
      this._writePackageConfig(context, colorByColumn, subcommands.package.trailingStrings.strings);
    }
    if (showAll || subcommands.module.isSet) {
      this._writeModuleConfig(context, colorByColumn, subcommands.module.trailingStrings.strings);
    }
    if (subcommands.command.isSet) {
      this._writeCommandConfig(context, colorByColumn, subcommands.command.trailingStrings.strings);
    }

    return ExitCode.SUCCESS;
  }

  private _writeCommandConfig(
    context: IContext,
    colorByColumn: Map<number, string> | undefined,
    names: string[]
  ) {
    const { commandRegistry, stdout } = context;

    let commandNames = commandRegistry.allCommands();
    if (names.length > 0) {
      const missing = names.filter(name => !commandNames.includes(name));
      if (missing.length > 0) {
        throw new GeneralError(`Unknown command(s): ${missing.sort().join(' ')}`);
      }
      commandNames = names.sort();
    }

    const table = new BorderTable({ colorByColumn, sortByColumn: [0] });
    table.addHeaderRow(['command', 'module']);
    for (const name of commandNames) {
      const runner = commandRegistry.get(name);
      if (runner === null) {
        // Should never happen.
        throw new GeneralError(`Unknown command '${name}'`);
      }
      table.addRow([name, runner.moduleName]);
    }
    table.write(stdout);
  }

  private _writeModuleConfig(
    context: IContext,
    colorByColumn: Map<number, string> | undefined,
    names: string[]
  ) {
    const { commandRegistry, commandModuleCache, stdout } = context;

    let modules = commandRegistry.allModules();
    const moduleNames = modules.map(module => module.name);
    if (names.length > 0) {
      const missing = names.filter(name => !moduleNames.includes(name));
      if (missing.length > 0) {
        throw new GeneralError(`Unknown module(s): ${missing.sort().join(' ')}`);
      }
      modules = modules.filter(module => names.includes(module.name));
    }

    const table = new BorderTable({ colorByColumn, sortByColumn: [0, 1] });
    table.addHeaderRow(['module', 'package', 'cached']);
    for (const module of modules) {
      table.addRow([
        module.name,
        module.packageName,
        commandModuleCache.has(module.packageName, module.name) ? 'yes' : ''
      ]);
    }
    table.write(stdout);
  }

  private _writeOrSetSyncStdinConfig(
    context: IContext,
    colorByColumn: Map<number, string> | undefined,
    name: string | undefined
  ) {
    const { stdinContext, stdout } = context;

    if (name !== undefined) {
      stdinContext.setEnabled(name);
    }

    const table = new BorderTable({ colorByColumn });
    table.addHeaderRow(['synchronous stdin', 'short name', 'available', 'enabled']);
    const { enabled, shortNames } = stdinContext;
    for (const shortName of shortNames) {
      table.addRow([
        stdinContext.longName(shortName),
        shortName,
        stdinContext.available(shortName) ? 'yes' : '',
        enabled === shortName ? 'yes' : ''
      ]);
    }
    table.write(stdout);
  }

  private _writePackageConfig(
    context: IContext,
    colorByColumn: Map<number, string> | undefined,
    names: string[]
  ) {
    const { commandRegistry, stdout } = context;

    let packageNames = [...commandRegistry.commandPackageMap.keys()];
    if (names.length > 0) {
      const missing = names.filter(name => !packageNames.includes(name));
      if (missing.length > 0) {
        throw new GeneralError(`Unknown package(s): ${missing.sort().join(' ')}`);
      }
      packageNames = names.sort();
    }

    const table = new BorderTable({ colorByColumn, sortByColumn: [0] });
    table.addHeaderRow(['package', 'type', 'version', 'build string', 'source']);
    for (const name of packageNames) {
      const pkg = commandRegistry.commandPackageMap.get(name)!;
      table.addRow([
        pkg.name,
        pkg.wasm ? 'wasm' : 'js',
        pkg.version,
        pkg.build_string,
        pkg.channel
      ]);
    }
    table.write(stdout);
  }

  private _writeVersion(context: IContext) {
    const { stdout } = context;
    stdout.write(`cockle ${COCKLE_VERSION}\n`);
  }
}
