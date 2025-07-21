import type {
  IJavaScriptRunContext,
  IJavaScriptTabCompleteContext,
  ITabCompleteResult
} from '@jupyterlite/cockle';
import { ExitCode, Options, TrailingStringsOption } from '@jupyterlite/cockle';

class TestOptions extends Options {
  trailingStrings = new TrailingStringsOption({
    possibles: (context: IJavaScriptTabCompleteContext) => [
      'color',
      'environment',
      'exitCode',
      'name',
      'readfile',
      'stderr',
      'stdin',
      'stdout',
      'writefile'
    ]
  });
}

export async function run(context: IJavaScriptRunContext): Promise<number> {
  const options = new TestOptions().parse(context.args);
  const args = options.trailingStrings.strings;

  if (args.includes('environment')) {
    context.environment.set('TEST_JS_VAR', '123');
    context.environment.delete('TEST_JS_VAR2');
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
        // r,g,b in range 0 to 255 inclusive.
        const r = (i + 1) * 8 - 1;
        const g = 128;
        const b = (j + 1) * 16 - 1;
        if (useColor) {
          line += `\x1b[38;2;${r};${g};${b}m`; // RGB color.
        }
        line += String.fromCharCode(65 + i);
        if (useColor) {
          line += '\x1b[1;0m'; // Reset color.
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

  if (args.includes('readfile')) {
    // Read from file and echo content to stdout.
    const { FS } = context.fileSystem;
    const filename = 'readfile.txt';
    try {
      // Exception thrown here will be handled by JavaScriptCommandRunner, but can provide more
      // precise error information here.
      const content = FS.readFile(filename, { encoding: 'utf8' });
      context.stdout.write(content);
    } catch {
      context.stderr.write(`Unable to open file ${filename} for reading`);
      return ExitCode.GENERAL_ERROR;
    }
  }

  if (args.includes('writefile')) {
    const { FS } = context.fileSystem;
    const filename = 'writefile.txt';
    try {
      // Exception thrown here will be handled by JavaScriptCommandRunner, but can provide more
      // precise error information here.
      FS.writeFile(filename, 'File written by js-test');
    } catch {
      context.stderr.write(`Unable to open file ${filename} for writing`);
      return ExitCode.GENERAL_ERROR;
    }
  }

  if (args.includes('exitCode')) {
    return ExitCode.GENERAL_ERROR;
  }
  return ExitCode.SUCCESS;
}

export async function tabComplete(
  context: IJavaScriptTabCompleteContext
): Promise<ITabCompleteResult> {
  return await new TestOptions().tabComplete(context);
}
