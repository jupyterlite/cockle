import type { IJavaScriptContext } from '@jupyterlite/cockle';
import { ExitCode } from '@jupyterlite/cockle';

export async function run(cmdName: string, context: IJavaScriptContext): Promise<number> {
  const { args, stdout } = context;
  stdout.write(cmdName + ': ' + args.map(arg => arg.toUpperCase()).join(','));
  return ExitCode.GENERAL_ERROR;
}
