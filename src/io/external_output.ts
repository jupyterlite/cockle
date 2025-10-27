import { IOutput } from './output';

/**
 * Output used by an ExternalCommand, exists in the main UI not webworker.
 * This effectively wraps a real IOutput in the webworker ShellImpl IContext.
 */
export interface IExternalOutput extends IOutput {}

export class ExternalOutput implements IExternalOutput {
  constructor(
    readonly callback: (text: string) => void,
    isTerminal: boolean
  ) {
    this._isTerminal = isTerminal;
  }

  flush(): void {}

  isTerminal(): boolean {
    return this._isTerminal;
  }

  supportsAnsiEscapes(): boolean {
    return this._isTerminal;
  }

  write(text: string): void {
    this.callback(text);
  }

  private _isTerminal: boolean;
}
