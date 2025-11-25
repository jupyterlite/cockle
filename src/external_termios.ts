import type { Termios } from './termios';

export class ExternalTermios implements Termios.ITermios {
  constructor(
    termiosFlags: Termios.IFlags,
    readonly setTermios: (flags: Termios.IFlags) => void
  ) {
    this._termiosFlags = termiosFlags;
  }

  get(): Termios.IFlags {
    return this._termiosFlags;
  }

  set(flags: Termios.IFlags): void {
    this._termiosFlags = flags;
    this.setTermios(flags);
  }

  private _termiosFlags: Termios.IFlags;
}
