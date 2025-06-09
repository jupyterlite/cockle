import { ExitCode, IExternalContext, IShell, Shell } from '@jupyterlite/cockle';
import { FitAddon } from '@xterm/addon-fit';
import { Terminal } from '@xterm/xterm';
import { IDemo } from './defs';

async function externalCommand(context: IExternalContext): Promise<number> {
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

export class Demo {
  constructor(options: IDemo.IOptions) {
    this._targetDiv = options.targetDiv;

    const termOptions = {
      rows: 50,
      theme: {
        foreground: 'white',
        background: 'black',
        cursor: 'silver'
      }
    };
    this._term = new Terminal(termOptions);

    this._fitAddon = new FitAddon();
    this._term.loadAddon(this._fitAddon);

    const { baseUrl, browsingContextId, shellManager } = options;

    this._shell = new Shell({
      browsingContextId,
      baseUrl,
      wasmBaseUrl: baseUrl,
      outputCallback: this.outputCallback.bind(this),
      shellManager,
      initialDirectories: ['dir'],
      initialFiles: {
        'file.txt': 'This is the contents of the file',
        'other.txt': 'Some other file\nSecond line',
        'months.txt':
          'January\nFebruary\nMarch\nApril\nMay\nJune\nJuly\nAugust\nSeptember\nOctober\nNovember\nDecember\n',
        'factorial.lua':
          'function factorial(n)\n' +
          '  if n == 0 then\n' +
          '    return 1\n' +
          '  else\n' +
          '    return n * factorial(n-1)\n' +
          '  end\n' +
          'end\n' +
          'print(factorial(tonumber(arg[1])))\n'
      }
    });

    this._shell.registerExternalCommand({ name: 'external-cmd', command: externalCommand });
  }

  async start(): Promise<void> {
    this._term!.onResize(async (arg: any) => await this.onResize(arg));
    this._term!.onData(async (data: string) => await this.onData(data));

    const resizeObserver = new ResizeObserver(entries => {
      this._fitAddon!.fit();
    });

    this._term!.open(this._targetDiv);
    await this._shell.start();
    resizeObserver.observe(this._targetDiv);
  }

  async onData(data: string): Promise<void> {
    await this._shell.input(data);
  }

  async onResize(arg: any): Promise<void> {
    await this._shell.setSize(arg.rows, arg.cols);
  }

  private outputCallback(text: string): void {
    this._term!.write(text);
  }

  private _targetDiv: HTMLElement;
  private _term: Terminal;
  private _fitAddon: FitAddon;
  private _shell: IShell;
}
