import type { IJavaScriptContext } from '@jupyterlite/cockle';
import { ExitCode } from '@jupyterlite/cockle';

export async function run(context: IJavaScriptContext): Promise<number> {
  const { args, name, stdout } = context;
  stdout.write(name + ': ' + args.join(','));
  return ExitCode.SUCCESS;
}
