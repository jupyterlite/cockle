/**
 * Input used by an ExternalCommand, exists in the main UI not webworker.
 * This effectively wraps a real IInput in the webworker ShellImpl IContext.
 */
export interface IExternalInput {
  isTerminal(): boolean;
  readAsync(maxChars: number | null): Promise<string>;
}

export class ExternalInput implements IExternalInput {
  constructor(
    readonly callback: (maxChars: number | null) => Promise<string>,
    isTerminal: boolean
  ) {
    this._isTerminal = isTerminal;
  }

  isTerminal(): boolean {
    return this._isTerminal;
  }

  async readAsync(maxChars: number | null): Promise<string> {
    return this.callback(maxChars);
  }

  private _isTerminal: boolean;
}
