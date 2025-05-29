import type { IJavaScriptContext } from '@jupyterlite/cockle';
import { ExitCode } from '@jupyterlite/cockle';

export async function run(context: IJavaScriptContext): Promise<number> {
  const { stdin, stdout } = context;

  // Read from stdin a character at a time and write it back capitalised until no further input is
  // available or EOT (ascii 4, Ctrl-C) is read.
  let stop = false;
  while (!stop) {
    const chars = await stdin.readAsync(null);
    if (chars.length === 0 || chars.endsWith('\x04')) {
      stop = true;
    } else {
      stdout.write(chars.toUpperCase());
    }
  }

  return ExitCode.SUCCESS;
}
