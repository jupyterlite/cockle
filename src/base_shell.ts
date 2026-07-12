import { PromiseDelegate, UUID } from '@lumino/coreutils';
import type { ISignal } from '@lumino/signaling';
import { Signal } from '@lumino/signaling';
import coincident from 'coincident';
import { proxy, wrap } from 'comlink';
import { ansi } from './ansi';
import type { IMainIO, IStdinReply, IStdinRequest } from './buffered_io';
import { ServiceWorkerMainIO, SharedArrayBufferMainIO } from './buffered_io';
import type { IOutputCallback } from './callback';
import type { ISize } from './callback';
import type { ICoincidentShellWorker } from './coincident_shell_worker';
import type { IComlinkShellWorker } from './comlink_shell_worker';
import type { IExternalRunContext } from './context';
import type { IShell } from './defs';
import type { IShellWorker, WorkerType } from './defs_internal';
import { DownloadTracker } from './download_tracker';
import { ExitCode } from './exit_code';
import type { IExternalCommand, IExternalTabCompleteResult } from './external_command';
import { ExternalEnvironment } from './external_environment';
import { ExternalTermios } from './external_termios';
import { ExternalInput, ExternalOutput } from './io';
import type { Termios } from './termios';

/**
 * Abstract base class for Shell that external libraries use.
 * It communicates with the real shell that runs in a web worker.
 */
export abstract class BaseShell implements IShell {
  constructor(options: IShell.IOptions) {
    this._shellId = options.shellId ?? UUID.uuid4();

    if (options.shellManager !== undefined) {
      options.shellManager.registerShell(
        this._shellId,
        this,
        this._serviceWorkerHandleStdin.bind(this)
      );
    }

    this._outputCallback = options.outputCallback;

    this._initialize(options);
  }

  /**
   * Call an external command, i.e. one that runs in the browser UI thread.
   */
  callExternalCommand(
    name: string,
    args: string[],
    environment: Record<string, string>,
    stdinIsTerminal: boolean,
    stdoutIsTerminal: boolean,
    stderrIsTerminal: boolean,
    termiosFlags: Termios.IFlags
  ): void {
    const remote = this._remote!;
    const commandOptions = this._externalCommands.get(name);
    if (commandOptions === undefined) {
      // This should not happen unless the command has not been registered properly.
      remote.exitExternalCommand({ exitCode: ExitCode.CANNOT_FIND_COMMAND });
      return;
    }

    const { command } = commandOptions;
    const externalEnvironment = new ExternalEnvironment(Object.entries(environment));
    const stdin = new ExternalInput(this.externalInput.bind(this), stdinIsTerminal);
    const stdout = new ExternalOutput(text => remote.externalOutput(text, false), stdoutIsTerminal);
    const stderr = new ExternalOutput(text => remote.externalOutput(text, true), stderrIsTerminal);
    const termios = new ExternalTermios(termiosFlags, remote.externalSetTermios);

    const context: IExternalRunContext = {
      name,
      args,
      environment: externalEnvironment,
      shellId: this._shellId,
      stdin,
      stdout,
      stderr,
      size: () => this.size,
      termios
    };
    command(context).then(exitCode => {
      // Exit code is returned via a separate message to the web worker rather than a return from this
      // function.
      const environmentChanges = externalEnvironment.changed;
      remote.exitExternalCommand({ exitCode, environmentChanges });
    });
  }

  /**
   * Call tab completion for an external command.
   */
  async callExternalTabComplete(name: string, args: string[]): Promise<IExternalTabCompleteResult> {
    const commandOptions = this._externalCommands.get(name);
    if (commandOptions === undefined) {
      // This should not happen unless the command has not been registered properly.
      console.warn("'{name} is not a registered external command");
      return {};
    }

    const { tabComplete } = commandOptions;
    if (tabComplete === undefined) {
      // This should not happen unless the command has not been registered properly.
      console.warn("External command '{name} does not support tab completion");
      return {};
    }

    return await tabComplete({ name, args, shellId: this._shellId });
  }

  protected createRemote(
    options: IShell.IOptions & { worker: Worker }
  ): ICoincidentShellWorker | IComlinkShellWorker {
    const { worker } = options;
    if (this.workerType === 'coincident') {
      const remote = coincident(worker) as ICoincidentShellWorker;

      remote.callExternalCommand = this.callExternalCommand.bind(this);
      remote.callExternalTabComplete = this.callExternalTabComplete.bind(this);
      remote.downloadModuleCallback = this.downloadWasmModuleCallback.bind(this);
      remote.enableBufferedStdinCallback = this.enableBufferedStdinCallback.bind(this);
      remote.externalInputReturn = this.externalInputReturn.bind(this);
      remote.outputCallback = options.outputCallback.bind(this);
      remote.setMainIOCallback = this._setMainIO.bind(this);
      remote.terminateCallback = this.dispose.bind(this);
      if (options.wasmUrlQueryParams !== undefined) {
        remote.wasmUrlQueryParamsCallback = options.wasmUrlQueryParams.bind(this);
      } else {
        // Cannot set undefined, coincident needs it to be a function.
        remote.wasmUrlQueryParamsCallback = filename => {
          return {};
        };
      }

      return remote;
    } else {
      const remote = wrap(worker) as IComlinkShellWorker;

      remote.registerCallbacks(
        proxy(this.callExternalCommand.bind(this)),
        proxy(this.callExternalTabComplete.bind(this)),
        proxy(this.downloadWasmModuleCallback.bind(this)),
        proxy(this.enableBufferedStdinCallback.bind(this)),
        proxy(this.externalInputReturn.bind(this)),
        proxy(options.outputCallback),
        proxy(this._setMainIO.bind(this)),
        proxy(this.dispose.bind(this)), // terminateCallback
        options.wasmUrlQueryParams !== undefined ? proxy(options.wasmUrlQueryParams) : undefined
      );

      return remote;
    }
  }

  dispose(): void {
    if (this._isDisposed) {
      return;
    }

    console.log('Cockle Shell disposed');
    this._isDisposed = true;

    this._remote = undefined;
    this._worker!.terminate();

    if (this._downloadTracker !== undefined) {
      this._downloadTracker!.dispose();
      this._downloadTracker = undefined;
    }

    if (this._sharedArrayBufferMainIO !== undefined) {
      this._sharedArrayBufferMainIO.dispose();
      this._sharedArrayBufferMainIO = undefined;
    }
    if (this._serviceWorkerMainIO !== undefined) {
      this._serviceWorkerMainIO.dispose();
      this._serviceWorkerMainIO = undefined;
    }
    (this._mainIO as any) = undefined;

    this._disposed.emit();
  }

  get disposed(): ISignal<this, void> {
    return this._disposed;
  }

  downloadWasmModuleCallback(packageName: string, moduleName: string, start: boolean): void {
    if (start) {
      if (this._downloadTracker !== undefined) {
        this._downloadTracker.dispose();
      }

      this._downloadTracker = new DownloadTracker(packageName, moduleName, this._outputCallback);
      this._downloadTracker.start();
    } else {
      if (
        this._downloadTracker !== undefined &&
        packageName === this._downloadTracker.packageName &&
        moduleName === this._downloadTracker.moduleName
      ) {
        this._downloadTracker.stop();
      }
    }
  }

  private async enableBufferedStdinCallback(enable: boolean): Promise<void> {
    if (this.isDisposed) {
      return;
    }

    if (enable) {
      await this._mainIO?.enable();
    } else {
      await this._mainIO?.disable();
    }
  }

  async exitCode(): Promise<number> {
    return (await this._remote?.exitCode()) ?? 1;
  }

  async externalInput(maxChars: number | null): Promise<string> {
    if (this._externalStdinPromise !== undefined) {
      this._externalStdinPromise.reject('Previous external stdin request did not complete');
    }
    const promise = new PromiseDelegate<string>();
    this._externalStdinPromise = promise;

    this._remote!.externalInput(maxChars);
    return await promise.promise;
  }

  // Handler for externalInputReturn callback from worker.
  externalInputReturn(text: string): void {
    if (this._externalStdinPromise !== undefined) {
      this._externalStdinPromise.resolve(text);
      this._externalStdinPromise = undefined;
    }
  }

  protected initRemoteOptions(options: IShell.IOptions): IShellWorker.IOptions {
    // Types of buffered IO supported.
    const sharedArrayBuffer = this._sharedArrayBufferMainIO?.sharedArrayBuffer ?? undefined;
    const supportsServiceWorker = this._serviceWorkerMainIO !== undefined;

    const externalCommandConfigs = options.externalCommands?.map(x => {
      return { name: x.name, hasTabComplete: x.tabComplete !== undefined };
    });

    const { baseUrl, browsingContextId, color, cwd, mountpoint, wasmBaseUrl } = options;
    const { aliases, environment, initialDirectories, initialFiles } = options;

    return {
      shellId: this.shellId,
      color: color ?? true,
      mountpoint,
      cwd,
      baseUrl,
      wasmBaseUrl,
      browsingContextId,
      aliases: aliases ?? {},
      environment: environment ?? {},
      externalCommandConfigs: externalCommandConfigs ?? [],
      sharedArrayBuffer,
      supportsServiceWorker,
      initialDirectories,
      initialFiles
    };
  }

  /**
   * Load the web worker.
   */
  protected abstract initWorker(options: IShell.IOptions): Worker;

  async input(char: string): Promise<void> {
    if (this.isDisposed) {
      return;
    }

    if (this._mainIO?.enabled) {
      await this._mainIO.push(char);
    } else {
      await this._remote!.input(char);
    }
  }

  get isDisposed(): boolean {
    return this._isDisposed;
  }

  /**
   * A promise that is fulfilled when the terminal is ready to be started.
   */
  get ready(): Promise<void> {
    return this._ready.promise;
  }

  /**
   * Set shell size.  Overloaded to take an `ISize` object or `rows` and `columns`.
   * The former is the recommended approach, the latter was the original implementation and should
   * be considered deprecated for eventual removal.
   */
  async setSize(size: ISize): Promise<void>;
  async setSize(rows: number, columns: number): Promise<void>;
  async setSize(sizeOrRows: ISize | number, columns?: number): Promise<void> {
    if (typeof sizeOrRows === 'object') {
      await this._setSizeImpl(sizeOrRows.rows, sizeOrRows.columns);
    } else if (columns === undefined) {
      const errMsg = 'Incorrect arguments passed to IShell.setSize';
      console.error(errMsg);
      throw new Error(errMsg);
    } else {
      await this._setSizeImpl(sizeOrRows, columns);
    }
  }

  get shellId(): string {
    return this._shellId;
  }

  get size(): ISize {
    return this._size;
  }

  async start(): Promise<void> {
    if (this.isDisposed) {
      return;
    }

    await this.ready;
    await this._remote!.start();
  }

  async themeChange(isDark?: boolean): Promise<void> {
    await this._remote?.themeChange(isDark);
  }

  // This will be called just once per Shell as the result is stored.
  // Can be overridden in derived classes to support different conditions.
  protected useCoincidentWorker(): boolean {
    return crossOriginIsolated;
  }

  get workerType(): WorkerType {
    if (this._workerType === undefined) {
      this._workerType = this.useCoincidentWorker() ? 'coincident' : 'comlink';
    }
    return this._workerType;
  }

  private async _initialize(options: IShell.IOptions): Promise<void> {
    const supportsSharedArrayBuffer = window.crossOriginIsolated;
    if (supportsSharedArrayBuffer) {
      this._sharedArrayBufferMainIO = new SharedArrayBufferMainIO();
    }

    let supportsServiceWorker = false;
    if (options.browsingContextId !== undefined) {
      this._serviceWorkerMainIO = new ServiceWorkerMainIO(
        options.baseUrl,
        options.browsingContextId,
        this.shellId
      );

      // Do not trust that service worker is functioning, test it.
      await this._serviceWorkerMainIO.enable();
      const ok = await this._serviceWorkerMainIO.testWithTimeout(1000);
      await this._serviceWorkerMainIO.disable();
      if (ok) {
        console.log('Service worker supports terminal stdin');
        supportsServiceWorker = true;
      } else {
        console.log('Service worker does not support terminal stdin');
        this._serviceWorkerMainIO.dispose();
        this._serviceWorkerMainIO = undefined;
      }
    }

    if (!supportsSharedArrayBuffer && !supportsServiceWorker) {
      let msg = 'ERROR: Terminal needs either SharedArrayBuffer or ServiceWorker available.';
      console.error(msg);
      if (options.color ?? true) {
        msg = ansi.styleBoldRed + msg + ansi.styleReset;
      }
      options.outputCallback(msg);
      this.dispose();
      return;
    }

    this._mainIO = this._sharedArrayBufferMainIO ?? this._serviceWorkerMainIO;

    // Register external commands here, the names are passed through to the WebWorker.
    options.externalCommands?.forEach(cmd => this._externalCommands.set(cmd.name, cmd));

    this._worker = this.initWorker(options);
    this._initRemote(options).then(this._ready.resolve.bind(this._ready));
  }

  private async _initRemote(options: IShell.IOptions) {
    if (this._worker === undefined) {
      throw new Error('Worker does not exist');
    }

    const rrr = this.createRemote({ ...options, worker: this._worker });

    this._remote = rrr;

    const remoteOptions = this.initRemoteOptions(options);
    await this._remote.initialize(remoteOptions);

    // Register sendStdinNow callback only after this._remote has been initialized.
    if (this._sharedArrayBufferMainIO !== undefined) {
      this._sharedArrayBufferMainIO.registerSendStdinNow(this._remote.input);
    }
    if (this._serviceWorkerMainIO !== undefined) {
      this._serviceWorkerMainIO.registerSendStdinNow(this._remote.input);
    }
  }

  private async _serviceWorkerHandleStdin(request: IStdinRequest): Promise<IStdinReply> {
    if (this._serviceWorkerMainIO !== undefined) {
      return await this._serviceWorkerMainIO.handleStdin(request);
    } else {
      // Should never be called if _serviceWorkerMainIO does not exist.
      throw new Error('No serviceWorker handleStdin exists');
    }
  }

  private _setMainIO(shortName: string): void {
    const oldMainIO = this._mainIO;

    if (shortName === 'sab' && this._sharedArrayBufferMainIO !== undefined) {
      this._mainIO = this._sharedArrayBufferMainIO;
    } else if (shortName === 'sw' && this._serviceWorkerMainIO !== undefined) {
      this._mainIO = this._serviceWorkerMainIO;
    } else {
      throw new Error(`Cannot set MainIO to '${shortName}'`);
    }

    // Disable old worker IO before switching it. This is a no-op if already disabled.
    oldMainIO?.disable();
  }

  private async _setSizeImpl(rows: number, columns: number): Promise<void> {
    if (this.isDisposed) {
      return;
    }

    this._size.rows = Math.max(0, rows);
    this._size.columns = Math.max(0, columns);

    await this._remote!.setSize(this._size);
  }

  private _disposed = new Signal<this, void>(this);
  private _isDisposed = false;
  private _ready = new PromiseDelegate<void>();

  private _shellId: string; // Unique identifier within a single browser tab.
  private _size: ISize = { rows: 0, columns: 0 };
  private _workerType?: WorkerType;
  private _worker?: Worker;
  private _remote?: ICoincidentShellWorker | IComlinkShellWorker;
  private _externalCommands = new Map<string, IExternalCommand.IOptions>();
  private _externalStdinPromise?: PromiseDelegate<string>;

  private _serviceWorkerMainIO?: ServiceWorkerMainIO;
  private _sharedArrayBufferMainIO?: SharedArrayBufferMainIO;
  private _mainIO?: IMainIO;

  private _downloadTracker?: DownloadTracker;
  private _outputCallback: IOutputCallback; // Only used by _downloadTracker.
}
