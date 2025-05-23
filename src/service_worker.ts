const broadcast = new BroadcastChannel('/cockle/service-worker');

// @ts-expect-error TS2769
self.addEventListener('install', onInstall);
// @ts-expect-error TS2769
self.addEventListener('activate', onActivate);
// @ts-expect-error TS2769
self.addEventListener('fetch', onFetch);

function onInstall(event: ExtendableEvent): void {
  // @ts-expect-error TS2339
  void self.skipWaiting();
}

function onActivate(event: ExtendableEvent): void {
  // @ts-expect-error TS2551
  event.waitUntil(self.clients.claim());
}

async function onFetch(event: FetchEvent): Promise<void> {
  const { request } = event;

  const url = new URL(request.url);
  const pathname = url.pathname;

  if (pathname === '/api/service-worker-heartbeat') {
    event.respondWith(new Response('ok'));
    return;
  }

  if (pathname.endsWith('/api/stdin/terminal')) {
    const responsePromise = broadcastOne(request, url);
    event.respondWith(responsePromise);
  }
}

async function broadcastOne(request: Request, url: URL): Promise<Response> {
  const message = await request.json();
  const promise = new Promise<Response>(resolve => {
    const messageHandler = (event: MessageEvent) => {
      const data = event.data;
      if (data.browsingContextId !== message.browsingContextId) {
        // bail if the message is not for us
        return;
      }
      const response = data.response;
      resolve(new Response(JSON.stringify(response)));
      broadcast.removeEventListener('message', messageHandler);
    };

    broadcast.addEventListener('message', messageHandler);
  });

  // Add URL pathname to message
  message.pathname = url.pathname;
  broadcast.postMessage(message);

  return await promise;
}
