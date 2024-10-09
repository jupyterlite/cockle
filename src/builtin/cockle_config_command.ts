import { BuiltinCommand } from './builtin_command';
import { ansi } from '../ansi';
import { Context } from '../context';
import { ExitCode } from '../exit_code';
import { toTable } from '../utils';
import { COCKLE_VERSION } from '../version';

export class CockleConfigCommand extends BuiltinCommand {
  get name(): string {
    return 'cockle-config';
  }

  protected async _run(context: Context): Promise<number> {
    const { stdout } = context;

    stdout.write(`cockle ${COCKLE_VERSION}\n`);
    this._writePackageConfig(context);

    return ExitCode.SUCCESS;
  }

  private _writePackageConfig(context: Context) {
    const { commandRegistry, stdout } = context;

    const map = commandRegistry.wasmPackageMap;

    const lines = [['package', 'version', 'build string', 'channel']];
    for (const pkg of map.values()) {
      lines.push([pkg.name, pkg.version, pkg.build_string, pkg.channel]);
    }

    let colorMap: Map<number, string> | null = null;
    if (stdout.supportsAnsiEscapes()) {
      colorMap = new Map();
      colorMap.set(1, ansi.styleBrightBlue);
      colorMap.set(2, ansi.styleBrightPurple);
      colorMap.set(3, ansi.styleGreen);
    }

    for (const line of toTable(lines, 1, false, colorMap)) {
      stdout.write(line + '\n');
    }
  }
}
