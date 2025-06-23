import { BuiltinCommand } from './builtin_command';
import { BooleanOption, OptionalStringOption } from './option';
import { Options } from './options';
import { IContext } from '../context';
import { GeneralError } from '../error_exit_code';
import { ExitCode } from '../exit_code';
import { BorderTable } from '../layout';
import { COCKLE_VERSION } from '../version';

class CockleConfigOptions extends Options {
  version = new BooleanOption('v', 'version', 'show cockle version');
  stdin = new OptionalStringOption('s', 'stdin', 'synchronous stdin configuration');
  package = new OptionalStringOption('p', 'package', 'show package information');
  module = new OptionalStringOption('m', 'module', 'show module information');
  command = new OptionalStringOption('c', 'command', 'show command information');
  help = new BooleanOption('h', 'help', 'display this help and exit');
}

export class CockleConfigCommand extends BuiltinCommand {
  get name(): string {
    return 'cockle-config';
  }

  protected async _run(context: IContext): Promise<number> {
    const { args, environment, stdout } = context;
    const options = new CockleConfigOptions().parse(args);

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
    if (showAll || options.stdin.isSet) {
      this._writeOrSetSyncStdinConfig(context, colorByColumn, options.stdin.string);
    }
    if (showAll || options.package.isSet) {
      this._writePackageConfig(context, colorByColumn, options.package.string);
    }
    if (showAll || options.module.isSet) {
      this._writeModuleConfig(context, colorByColumn, options.module.string);
    }
    if (options.command.isSet) {
      this._writeCommandConfig(context, colorByColumn, options.command.string);
    }

    return ExitCode.SUCCESS;
  }

  private _writeCommandConfig(
    context: IContext,
    colorByColumn: Map<number, string> | undefined,
    name: string | undefined
  ) {
    const { commandRegistry, stdout } = context;
    const names = name === undefined ? commandRegistry.allCommands() : [name];

    const table = new BorderTable({ colorByColumn, sortByColumn: [0] });
    table.addHeaderRow(['command', 'module']);
    for (const name of names) {
      const runner = commandRegistry.get(name);
      if (runner === null) {
        throw new GeneralError(`Unknown command '${name}'`);
      }
      table.addRow([name, runner.moduleName]);
    }

    table.write(stdout);
  }

  private _writeModuleConfig(
    context: IContext,
    colorByColumn: Map<number, string> | undefined,
    name: string | undefined
  ) {
    const { commandRegistry, commandModuleCache, stdout } = context;

    let modules = commandRegistry.allModules();
    if (name !== undefined) {
      modules = modules.filter(module => module.name === name);
      if (modules.length === 0) {
        throw new GeneralError(`Unknown module '${name}'`);
      }
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
    name: string | undefined
  ) {
    const { commandRegistry, stdout } = context;

    let packages = [...commandRegistry.commandPackageMap.values()];
    if (name !== undefined) {
      packages = packages.filter(pkg => pkg.name === name);
      if (packages.length === 0) {
        throw new GeneralError(`Unknown package '${name}'`);
      }
    }

    const table = new BorderTable({ colorByColumn, sortByColumn: [0] });
    table.addHeaderRow(['synchronous stdin', 'short name', 'available', 'enabled']);
    for (const pkg of packages) {
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
