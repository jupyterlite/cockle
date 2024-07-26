export class MockTerminalStdin {
  enableBufferedStdinCallback(enable: boolean) {
    if (enable) {
      this.enableCallCount++;
    } else {
      this.disableCallCount++;
    }
  }

  stdinCallback(): number[] {
    const ret = this.callCount < this._returns.length ? this._returns[this.callCount] : [4];
    this.callCount++;
    return ret;
  }

  public callCount = 0;
  private _returns = [[90], [100], [122], [32], [100]];
  public enableCallCount = 0;
  public disableCallCount = 0;
}
