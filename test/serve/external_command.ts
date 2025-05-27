import { IExternalContext } from '@jupyterlite/cockle';

// External command with different bahaviour depending on supplied args, to test
// external command functionality.
export async function externalCommand(context: IExternalContext): Promise<number> {
  const { args } = context;

  if (args.includes('environment')) {
    context.environment.set('TEST_VAR', '23');
  }

  if (args.includes('stdout')) {
    context.stdout.write('Output line 1\n');
    context.stdout.write('Output line 2\n');
  }

  if (args.includes('stderr')) {
    context.stderr.write('Error message\n');
  }

  if (args.includes('exitCode')) {
    return 1;
  }
  return 0;
}
