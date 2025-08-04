import { BuiltinCommand } from './builtin_command';
import { CommandArguments } from '../arguments';
import { BooleanArgument, PositionalArguments } from '../argument';
import { IRunContext, ITabCompleteContext } from '../context';
import { ExitCode } from '../exit_code';
import { ITabCompleteResult } from '../tab_complete';

class HelpArguments extends CommandArguments {
  help = new BooleanArgument('h', 'help', 'display this help and exit');
  positional = new PositionalArguments({ min: 0 });

  constructor() {
    super({
      description:
        "Show help for built-in commands. With no arguments, lists available builtins. With names, shows each command's help (equivalent to '<cmd> --help')."
    });
  }
}

export class HelpCommand extends BuiltinCommand {
  get name(): string {
    return 'help';
  }

  async tabComplete(context: ITabCompleteContext): Promise<ITabCompleteResult> {
    const allBuiltins = context.commandRegistry?.builtInCommands() ?? [];

    // Determine the current fragment the user is trying to complete.
    const last = context.args.length > 0 ? context.args[context.args.length - 1] : '';
    const filtered = allBuiltins.filter(cmd => cmd.startsWith(last));

    // If the completion system supports specifying what to replace, supply the fragment.
    return {
      possibles: filtered,
      replace: last
    } as unknown as ITabCompleteResult;
  }

  protected async _run(context: IRunContext): Promise<number> {
    const { args, stdout, stderr, commandRegistry } = context;
    const parsed = new HelpArguments().parse(args);

    if (parsed.help.isSet) {
      parsed.writeHelp(stdout);
      return ExitCode.SUCCESS;
    }

    const targets = parsed.positional.strings;
    const builtins = commandRegistry ? commandRegistry.builtInCommands() : [];

    if (targets.length === 0) {
      stdout.write('Built-in commands:\n');
      for (const name of builtins.sort()) {
        stdout.write(`  ${name}\n`);
      }
      stdout.write('\n');
      stdout.write(
        'For detailed help, type <command-name> --help (e.g., `history --help` or `alias -h`).'
      );
      return ExitCode.SUCCESS;
    }

    let overallExit: number = ExitCode.SUCCESS;

    for (const target of targets) {
      if (!builtins.includes(target)) {
        stderr.write(`help: unknown built-in: ${target}\n`);
        overallExit = ExitCode.GENERAL_ERROR;
        continue;
      }

      const runner = commandRegistry.get(target);
      if (runner === null) {
        stderr.write(`help: failed to get command '${target}'\n`);
        overallExit = ExitCode.GENERAL_ERROR;
        continue;
      }

      const subContext: IRunContext = {
        ...context,
        name: target,
        args: ['--help']
      } as unknown as IRunContext;

      stdout.write(`\n=== help for ${target} ===\n`);
      await runner.run(subContext);
    }

    return overallExit;
  }
}
