import type { IExternalRunContext } from '@jupyterlite/cockle';
import { ansi, delay, ExitCode } from '@jupyterlite/cockle';

export async function externalPagerCommand(context: IExternalRunContext): Promise<number> {
  const { args, name, stderr, stdout } = context;

  if (args[0] === '-h' || args[0] === '--help') {
    stdout.write(
      `Usage: ${name} [LINES] [DELAY]\n` +
        'Write LINES lines of demo output using a pager, similar to less.\n' +
        '\n' +
        '  LINES       number of lines to write, default 100\n' +
        '  DELAY       delay in milliseconds between lines, default 0\n' +
        '  -h, --help  display this help and exit\n' +
        '\n' +
        'Once the output fills the page, press h for pager help or q to quit. If there is a\n' +
        'delay between lines, quitting the pager before all lines are written stops the command.\n'
    );
    return ExitCode.SUCCESS;
  }

  // Optional first argument is the number of lines to write.
  const count = args.length > 0 ? parseInt(args[0]) : 100;
  if (isNaN(count) || count < 0) {
    stderr.write(`${name}: invalid number of lines '${args[0]}'\n`);
    return ExitCode.GENERAL_ERROR;
  }

  // Optional second argument is the delay in milliseconds between lines.
  const delayMs = args.length > 1 ? parseInt(args[1]) : 0;
  if (isNaN(delayMs) || delayMs < 0) {
    stderr.write(`${name}: invalid delay '${args[1]}'\n`);
    return ExitCode.GENERAL_ERROR;
  }

  const pager = context.services.createPager();

  for (let i = 0; i < count && !pager.hasQuit; i++) {
    if (i % 10 === 5) {
      // Long line that wraps, with a style that spans the wrap.
      pager.write(
        `${i}: ` + ansi.styleBrightPurple + 'external pager '.repeat(20) + ansi.styleReset + '\n'
      );
    } else if (i % 10 === 8) {
      // Empty line.
      pager.write('\n');
    } else if (i % 10 === 9) {
      // Wide characters.
      pager.write(`${i}: 中文字🚀🚀\n`);
    } else {
      pager.write(`${i}: ` + ansi.styleCyan + 'external line' + ansi.styleReset + '\n');
    }

    if (delayMs > 0) {
      await delay(delayMs);
    }
  }

  await pager.close();
  return ExitCode.SUCCESS;
}
