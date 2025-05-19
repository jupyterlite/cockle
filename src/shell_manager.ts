import { IShell } from './defs';

/**
 * Shell manager that knows about all shells in a particular browser tab.
 * Routes service worker requests received in the UI thread to the correct shell.
 */
export class ShellManager {
  static get(id: string): IShell | undefined {
    return this._checkInitialised().get(id);
  }

  static ids(): string[] {
    const shells = this._checkInitialised();
    return [...shells.keys()];
  }

  static register(shell: IShell) {
    const shells = this._checkInitialised();
    const { shellId } = shell;
    shells.set(shellId, shell);
  }

  static unregister(shell: IShell) {
    const shells = this._checkInitialised();
    const { shellId } = shell;
    shells.delete(shellId);
  }

  private static _checkInitialised(): Map<string, IShell> {
    if (this._shells === undefined) {
      this._shells = new Map<string, IShell>();
    }
    return this._shells;
  }

  // Only created when first needed.
  private static _shells?: Map<string, IShell>;
}
