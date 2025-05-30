import { BuiltinCommand } from './builtin_command';
import { BooleanOption, OptionalStringOption } from './option';
import { Options } from './options';
import { ansi } from '../ansi';
import { IContext } from '../context';
import { GeneralError } from '../error_exit_code';
import { ExitCode } from '../exit_code';
import { toTable } from '../utils';
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
    const { args, stdout } = context;
    const options = new CockleConfigOptions().parse(args);

    if (options.help.isSet) {
      options.writeHelp(stdout);
      return ExitCode.SUCCESS;
    }

    const showAll = args.length === 0;
    if (showAll || options.version.isSet) {
      this._writeVersion(context);
    }
    if (showAll || options.stdin.isSet) {
      this._writeOrSetSyncStdinConfig(context, options.stdin.string);
    }
    if (showAll || options.package.isSet) {
      this._writePackageConfig(context, options.package.string);
    }
    if (showAll || options.module.isSet) {
      this._writeModuleConfig(context, options.module.string);
    }
    if (options.command.isSet) {
      this._writeCommandConfig(context, options.command.string);
    }

    return ExitCode.SUCCESS;
  }

  private _writeCommandConfig(context: IContext, name: string | undefined) {
    const { commandRegistry } = context;
    const names = name === undefined ? commandRegistry.allCommands() : [name];
    const lines = [['command', 'module']];

    for (const name of names) {
      const runner = commandRegistry.get(name);
      if (runner === null) {
        throw new GeneralError(`Unknown command '${name}'`);
      }
      lines.push([name, runner.moduleName]);
    }

    this._writeTable(context, lines);
  }

  private _writeModuleConfig(context: IContext, name: string | undefined) {
    const { commandRegistry, commandModuleCache } = context;

    let modules = commandRegistry.allModules();
    if (name !== undefined) {
      modules = modules.filter(module => module.name === name);
      if (modules.length === 0) {
        throw new GeneralError(`Unknown module '${name}'`);
      }
    }

    const lines = [['module', 'package', 'cached']];
    for (const module of modules) {
      lines.push([
        module.name,
        module.packageName,
        commandModuleCache.has(module.packageName, module.name) ? 'yes' : ''
      ]);
    }

    this._writeTable(context, lines);
  }

  private _writeOrSetSyncStdinConfig(context: IContext, name: string | undefined) {
    const { stdinContext } = context;

    if (name !== undefined) {
      stdinContext.setEnabled(name);
    }

    const { enabled, shortNames } = stdinContext;
    const lines = [['synchronous stdin', 'short name', 'available', 'enabled']];
    for (const shortName of shortNames) {
      lines.push([
        stdinContext.longName(shortName),
        shortName,
        stdinContext.available(shortName) ? 'yes' : '',
        enabled === shortName ? 'yes' : ''
      ]);
    }

    this._writeTable(context, lines);
  }

  private _writePackageConfig(context: IContext, name: string | undefined) {
    const { commandRegistry } = context;

    let packages = [...commandRegistry.commandPackageMap.values()];
    if (name !== undefined) {
      packages = packages.filter(pkg => pkg.name === name);
      if (packages.length === 0) {
        throw new GeneralError(`Unknown package '${name}'`);
      }
    }

    const lines = [['package', 'type', 'version', 'build string', 'source']];
    for (const pkg of packages) {
      lines.push([pkg.name, pkg.wasm ? 'wasm' : 'js', pkg.version, pkg.build_string, pkg.channel]);
    }

    this._writeTable(context, lines);
  }

  private _writeTable(context: IContext, lines: string[][]) {
    const { environment, stdout } = context;

    let colorMap: Map<number, string> | null = null;
    if (stdout.supportsAnsiEscapes() && environment.color) {
      colorMap = new Map();
      colorMap.set(1, ansi.styleBrightBlue);
      colorMap.set(2, ansi.styleBrightPurple);
      colorMap.set(3, ansi.styleGreen);
      colorMap.set(4, ansi.styleYellow);
    }

    for (const line of toTable(lines, 1, false, colorMap)) {
      stdout.write(line + '\n');
    }
  }

  private _writeVersion(context: IContext) {
    const { stdout } = context;
    stdout.write(`cockle ${COCKLE_VERSION}\n`);
  }
}
