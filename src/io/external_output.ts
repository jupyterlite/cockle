/**
 * Output used by an ExternalCommand, exists in the main UI not webworker.
 * This effectively wraps a real IOutput in the webworker ShellImpl IContext.
 */
export interface IExternalOutput {
  supportsAnsiEscapes(): boolean;
  write(text: string): void;
}

export class ExternalOutput implements IExternalOutput {
  constructor(
    readonly callback: (text: string) => void,
    supportsAnsiEscapes: boolean
  ) {
    this._supportsAnsiEscapes = supportsAnsiEscapes;
  }

  supportsAnsiEscapes(): boolean {
    return this._supportsAnsiEscapes;
  }

  write(text: string): void {
    this.callback(text);
  }

  private _supportsAnsiEscapes: boolean;
}
