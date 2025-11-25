import type { ISetMainIOCallback } from '../callback_internal';

export interface IStdinContext {
  available(shortName: string): boolean;
  get enabled(): string;
  get shortNames(): string[];
  longName(shortName: string): string;
  setAvailable(shortName: string, available: boolean): void;
  setEnabled(enabled: string): void;
}

export interface ISetWorkerIO {
  (shortName: string): void;
}

type Entry = {
  longName: string;
  available: boolean;
};

export class StdinContext implements IStdinContext {
  constructor(
    readonly setMainIO: ISetMainIOCallback,
    readonly setWorkerIO: ISetWorkerIO
  ) {
    this._map.set('sab', { longName: 'shared array buffer', available: false });
    this._map.set('sw', { longName: 'service worker', available: false });
  }

  available(shortName: string): boolean {
    return this._getByShortName(shortName).available;
  }

  get enabled(): string {
    return this._enabled;
  }

  get shortNames(): string[] {
    return Array(...this._map.keys());
  }

  longName(shortName: string): string {
    return this._getByShortName(shortName).longName;
  }

  setAvailable(shortName: string, available: boolean): void {
    this._getByShortName(shortName).available = available;
  }

  setEnabled(shortOrLongName: string): void {
    if (this._map.has(shortOrLongName)) {
      this._enable(shortOrLongName);
      return;
    }

    const match = Object.entries(this._map).find(
      ([_, entry]) => entry.longName === shortOrLongName
    );
    if (match !== undefined) {
      this._enable(match[0]);
    } else {
      throw new Error(`Unknown StdinContext name '${shortOrLongName}'`);
    }
  }

  private _enable(shortName: string): void {
    // shortName must exist, check already performed in setEnabled.
    if (shortName === this._enabled) {
      return;
    }

    if (!this._getByShortName(shortName).available) {
      throw new Error(`StdinContext '${shortName}' is not available`);
    }

    this._enabled = shortName;
    if (this._initialised) {
      this.setWorkerIO(shortName);
      this.setMainIO(shortName);
    } else {
      this._initialised = true;
    }
  }

  private _getByShortName(shortName: string): Entry {
    const entry = this._map.get(shortName);
    if (entry === undefined) {
      throw new Error(`Unknown shortName '${shortName}' passed to StdinContext`);
    }
    return entry;
  }

  private _map: Map<string, Entry> = new Map();
  private _enabled = ''; // Short name of enabled implementation.
  private _initialised = false;
}
