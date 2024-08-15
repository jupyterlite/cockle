import { Shell } from '@jupyterlite/cockle';
import { FitAddon } from '@xterm/addon-fit';
import { Terminal } from '@xterm/xterm';
import { IDemo } from './defs';

export class Demo {
  constructor(options: IDemo.IOptions) {
    this._options = options;

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

    this._shell = new Shell({
      wasmBaseUrl: window.location.href,
      outputCallback: this.outputCallback.bind(this),
      initialDirectories: ['dir'],
      initialFiles: {
        'file.txt': 'This is the contents of the file',
        'other.txt': 'Some other file\nSecond line',
        'months.txt':
          'January\nFebruary\nMarch\nApril\nMay\nJune\nJuly\nAugust\nSeptember\nOctober\nNovember\nDecember\n'
      }
    });
  }

  async start(): Promise<void> {
    this._term!.onResize(async (arg: any) => await this.onResize(arg));
    this._term!.onKey(async (arg: any) => await this.onKey(arg));

    const resizeObserver = new ResizeObserver(entries => {
      this._fitAddon!.fit();
    });

    this._term!.open(this._options!.targetDiv);
    await this._shell.start();
    resizeObserver.observe(this._options!.targetDiv);
  }

  async onKey(arg: any): Promise<void> {
    await this._shell.input(arg.key);
  }

  async onResize(arg: any): Promise<void> {
    await this._shell.setSize(arg.rows, arg.cols);
  }

  private async outputCallback(text: string): Promise<void> {
    this._term!.write(text);
  }

  private _options: IDemo.IOptions;
  private _term: Terminal;
  private _fitAddon: FitAddon;
  private _shell: Shell;
}