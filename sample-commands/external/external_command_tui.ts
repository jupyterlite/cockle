import type { IExternalRunContext } from '@jupyterlite/cockle';
import { ansi, ExitCode, Termios } from '@jupyterlite/cockle';

export async function externalTuiCommand(context: IExternalRunContext): Promise<number> {
  const { name, stdin, stdout, termios } = context;

  if (!stdout.isTerminal()) {
    context.stderr.write(`${name} aborting, stdout is not a tty`);
    return ExitCode.GENERAL_ERROR;
  }

  // Disable canonical mode (buffered I/O) and echo from stdin to stdout.
  const oldTermios = termios.get();
  const newTermios = Termios.cloneFlags(oldTermios);
  newTermios.c_lflag &= ~Termios.LocalFlag.ICANON & ~Termios.LocalFlag.ECHO;

  try {
    termios.set(newTermios);
    stdout.write(ansi.enableAlternativeBuffer);

    let useColor = true;
    let text = '';
    let stop = false;

    while (!stop) {
      await render(context, useColor, text);

      const input = await stdin.readAsync(null);
      if (input.length < 1 || input[0] === '\x04') {
        stop = true;
      } else {
        text += input;
        useColor = !useColor;
      }
    }
  } finally {
    stdout.write(ansi.disableAlternativeBuffer);
    termios.set(oldTermios);
  }

  return ExitCode.SUCCESS;
}

async function render(context: IExternalRunContext, useColor: boolean, text: string) {
  const { stdout } = context;
  stdout.write(ansi.eraseScreen);
  stdout.write(ansi.cursorHome);

  const prefix = useColor ? ansi.styleBrightPurple : '';
  const suffix = useColor ? ansi.styleReset : '';
  stdout.write(prefix + 'external-tui: ' + text + suffix);
}
