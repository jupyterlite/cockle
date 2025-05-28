import { PromiseDelegate, UUID } from '@lumino/coreutils';

import { ShellManager } from './shell_manager';
import { COCKLE_VERSION } from './version';

const DRIVE_API_PATH = '/cockle/service-worker';

/**
 * Used to keep the service worker alive
 */
const SW_PING_ENDPOINT = '/api/service-worker-heartbeat';

/**
 * A class that manages the Service Worker registration and communication, used to
 * access stdin whilst WebAssembly commands are running.
 * May also install its own service worker rather than using one that is already
 * installed by, for example. JupyterLite.
 */
export class ServiceWorkerManager {
  constructor(
    readonly baseUrl: string,
    readonly shellManager: ShellManager
  ) {
    // Initialize broadcast channel related properties
    this._browsingContextId = UUID.uuid4();
    this._broadcastChannel = new BroadcastChannel(DRIVE_API_PATH);
    this._broadcastChannel.addEventListener('message', this._onBroadcastMessage);

    void this._initialize().catch(console.warn);
  }

  get enabled(): boolean {
    return this._registration !== null;
  }

  get browsingContextId(): string {
    return this._browsingContextId;
  }

  get ready(): Promise<void> {
    return this._ready.promise;
  }

  private async _initialize(): Promise<void> {
    const { serviceWorker } = navigator;

    let registration: ServiceWorkerRegistration | null = null;

    if (!serviceWorker) {
      console.warn('ServiceWorkers not supported in this browser');
      return;
    } else if (serviceWorker.controller) {
      const scriptURL = serviceWorker.controller.scriptURL;
      await this._unregisterOldServiceWorkers(scriptURL);

      registration = (await serviceWorker.getRegistration(scriptURL)) || null;
      // eslint-disable-next-line no-console
      console.info('JupyterLite ServiceWorker was already registered');
    }

    if (!registration && serviceWorker) {
      try {
        // eslint-disable-next-line no-console
        console.info('Registering new ServiceWorker');
        //registration = await serviceWorker.register(workerUrl);
        registration = await serviceWorker.register(new URL('service_worker.js', import.meta.url), {
          type: 'module'
        });

        // eslint-disable-next-line no-console
        console.info('ServiceWorker successfully registered');
      } catch (err: any) {
        console.warn(err);
        console.warn(`JupyterLite ServiceWorker registration unexpectedly failed: ${err}`);
      }
    }

    this._setRegistration(registration);

    if (!registration) {
      this._ready.reject(void 0);
    } else {
      this._ready.resolve(void 0);
      setTimeout(this._pingServiceWorker, 20000);
    }
  }

  private _onBroadcastMessage = async (
    event: MessageEvent<{
      data: any;
      browsingContextId: string;
      pathname: string;
    }>
  ): Promise<void> => {
    const { browsingContextId, data, pathname } = event.data;

    if (browsingContextId !== this._browsingContextId) {
      // Message is not meant for us
      return;
    }

    if (!pathname.includes('/api/stdin/terminal')) {
      return;
    }

    const response = await this.shellManager.handleStdin(data);
    this._broadcastChannel.postMessage({
      response,
      browsingContextId: this._browsingContextId
    });
  };

  private async _pingServiceWorker(): Promise<void> {
    const response = await fetch(SW_PING_ENDPOINT);
    const text = await response.text();
    if (text === 'ok') {
      setTimeout(this._pingServiceWorker, 20000);
    }
  }

  private _setRegistration(registration: ServiceWorkerRegistration | null) {
    this._registration = registration;
  }

  private async _unregisterOldServiceWorkers(scriptURL: string): Promise<void> {
    const versionKey = `${scriptURL}-version`;
    // Check if we have an installed version. If we do, compare it to the current version
    // and unregister all service workers if they are different.
    const installedVersion = localStorage.getItem(versionKey);

    if ((installedVersion && installedVersion !== COCKLE_VERSION) || !installedVersion) {
      // eslint-disable-next-line no-console
      console.info('New version, unregistering existing service workers.');
      const registrations = await navigator.serviceWorker.getRegistrations();

      await Promise.all(registrations.map(registration => registration.unregister()));

      // eslint-disable-next-line no-console
      console.info('All existing service workers have been unregistered.');
    }

    localStorage.setItem(versionKey, COCKLE_VERSION);
  }

  private _registration: ServiceWorkerRegistration | null = null;
  private _ready = new PromiseDelegate<void>();
  private _broadcastChannel: BroadcastChannel;
  private _browsingContextId: string;
}
