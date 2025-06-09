import { ExitCode, IExternalContext } from '@jupyterlite/cockle';

// External command with different bahaviour depending on supplied args, to test
// external command functionality.
export async function externalCommand(context: IExternalContext): Promise<number> {
  const { args } = context;

  if (args.includes('environment')) {
    context.environment.set('TEST_VAR', '23');
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
