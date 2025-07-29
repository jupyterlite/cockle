/**
 * The same functionality as external_command.ts but using Options with tab completion.
 */
import {
  ansi,
  CommandArguments,
  ExitCode,
  IExternalContext,
  IExternalTabCompleteContext,
  IExternalTabCompleteResult,
  PositionalArguments
} from '@jupyterlite/cockle';

class TestArguments extends CommandArguments {
  positional = new PositionalArguments({
    possibles: (context: IExternalTabCompleteContext) => [
      'color',
      'environment',
      'exitCode',
      'name',
      'stderr',
      'stdin',
      'stdout'
    ]
  });
}

export async function externalTabComplete(
  context: IExternalTabCompleteContext
): Promise<IExternalTabCompleteResult> {
  return new TestArguments().tabComplete(context);
}

export async function externalRun(context: IExternalContext): Promise<number> {
  const args = new TestArguments().parse(context.args).positional.strings;

  if (args.includes('environment')) {
    context.environment.set('TEST_VAR', '23');
    context.environment.delete('TEST_VAR2');
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
        if (useColor) {
          line += ansi.styleRGB((i + 1) * 8 - 1, 128, (j + 1) * 16 - 1);
        }
        line += String.fromCharCode(65 + i);
        if (useColor) {
          line += ansi.styleReset;
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
      } else {
        stdout.write(chars.toUpperCase());
      }
    }
  }

  if (args.includes('exitCode')) {
    return ExitCode.GENERAL_ERROR;
  }
  return ExitCode.SUCCESS;
}
