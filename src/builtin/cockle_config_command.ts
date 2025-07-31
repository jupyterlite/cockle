import { BuiltinCommand } from './builtin_command';
import { BooleanArgument, PositionalArguments } from '../argument';
import { CommandArguments, SubcommandArguments } from '../arguments';
import { IRunContext, ITabCompleteContext } from '../context';
import { GeneralError } from '../error_exit_code';
import { ExitCode } from '../exit_code';
import { BorderTable } from '../layout';
import { ITabCompleteResult } from '../tab_complete';
import { COCKLE_VERSION } from '../version';

class CommandSubcommand extends SubcommandArguments {
  positional = new PositionalArguments({
    possibles: (context: ITabCompleteContext) =>
      context.commandRegistry ? context.commandRegistry.match(context.args.at(-1) || '') : []
  });
}

class ModuleSubcommand extends SubcommandArguments {
  positional = new PositionalArguments({
    possibles: (context: ITabCompleteContext) =>
      context.commandRegistry ? context.commandRegistry.allModules().map(module => module.name) : []
  });
}

class PackageSubcommand extends SubcommandArguments {
  positional = new PositionalArguments({
    possibles: (context: ITabCompleteContext) => {
      return context.commandRegistry ? [...context.commandRegistry.commandPackageMap.keys()] : [];
    }
  });
}

class StdinSubcommand extends SubcommandArguments {
  positional = new PositionalArguments({
    max: 1,
    possibles: (context: ITabCompleteContext) =>
      context.stdinContext ? context.stdinContext.shortNames : []
  });
}

class CockleConfigArguments extends CommandArguments {
  version = new BooleanArgument('v', 'version', 'show cockle version');
  help = new BooleanArgument('h', 'help', 'display this help and exit');
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

  get description(): string {
    return 'Configure or view Cockle shell settings.';
  }

  help(): string {
    return `Usage: cockle-config [key] [value]
  
  View or set configuration options for the Cockle shell.
  
  Examples:
    cockle-config promptColor red
    cockle-config                # Show current configuration`;
  }

  async tabComplete(context: ITabCompleteContext): Promise<ITabCompleteResult> {
    return await new CockleConfigArguments().tabComplete(context);
  }

  protected async _run(context: IRunContext): Promise<number> {
    const { environment, stdout } = context;
    const args = new CockleConfigArguments().parse(context.args);
    const { subcommands } = args;

    if (args.help.isSet) {
      args.writeHelp(stdout);
      return ExitCode.SUCCESS;
    }

    const colorByColumn =
      stdout.supportsAnsiEscapes() && environment.color
        ? BorderTable.defaultColorByColumn()
        : undefined;

    const showAll = context.args.length === 0;
    if (showAll || args.version.isSet) {
      this._writeVersion(context);
    }
    if (showAll || subcommands.stdin.isSet) {
      this._writeOrSetSyncStdinConfig(
        context,
        colorByColumn,
        subcommands.stdin.positional.strings.at(0)
      );
    }
    if (showAll || subcommands.package.isSet) {
      this._writePackageConfig(context, colorByColumn, subcommands.package.positional.strings);
    }
    if (showAll || subcommands.module.isSet) {
      this._writeModuleConfig(context, colorByColumn, subcommands.module.positional.strings);
    }
    if (subcommands.command.isSet) {
      this._writeCommandConfig(context, colorByColumn, subcommands.command.positional.strings);
    }

    return ExitCode.SUCCESS;
  }

  private _writeCommandConfig(
    context: IRunContext,
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
    context: IRunContext,
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
    context: IRunContext,
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
    context: IRunContext,
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

  private _writeVersion(context: IRunContext) {
    const { stdout } = context;
    stdout.write(`cockle ${COCKLE_VERSION}\n`);
  }
}
