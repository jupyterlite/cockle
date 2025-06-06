import { IStdinReply, IStdinRequest } from './defs';
import { joinURL } from '../utils';

export enum AsyncOrSync {
  ASYNC = 0,
  SYNC = 1
}

export class ServiceWorkerUtils {
  constructor(
    baseUrl: string,
    readonly browsingContextId: string,
    readonly shellId: string
  ) {
    this._url = joinURL(baseUrl, 'api/stdin/terminal');
  }

  getStdin(timeoutMs: number): string {
    try {
      const { xhr, msg } = this._prepareStdinRequest(timeoutMs, AsyncOrSync.SYNC);
      xhr.send(msg); // Block until the input reply is received.
      return this._processStdinReply(xhr.responseText);
    } catch (err) {
      console.error(`Failed to request stdin via service worker: ${err}`);
      return '';
    }
  }

  async getStdinAsync(timeoutMs: number, test: boolean = false): Promise<string> {
    try {
      const { xhr, msg } = this._prepareStdinRequest(timeoutMs, AsyncOrSync.ASYNC, test);
      const replyText = new Promise<string>((resolve, reject) => {
        xhr.onload = () => resolve(xhr.responseText);
        xhr.onerror = () => reject('XHR error');
      });
      xhr.send(msg);
      return this._processStdinReply(await replyText);
    } catch (err) {
      console.error(`Failed to request stdin via service worker: ${err}`);
      return '';
    }
  }

  private _prepareStdinRequest(
    timeoutMs: number,
    asyncOrSync: AsyncOrSync,
    test: boolean = false
  ): { xhr: XMLHttpRequest; msg: string } {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', this._url, asyncOrSync === AsyncOrSync.ASYNC);
    const data: IStdinRequest = { shellId: this.shellId, timeoutMs };
    if (test) {
      data['test'] = true;
    }
    const msg = JSON.stringify({ browsingContextId: this.browsingContextId, data });
    return { xhr, msg };
  }

  private _processStdinReply(replyText: string): string {
    const reply: IStdinReply = JSON.parse(replyText);
    if ('error' in reply) {
      // Service worker may return an error instead of an input reply message.
      throw new Error(reply['error']);
    } else if (reply.text !== undefined) {
      return reply.text ?? '';
    } else {
      throw new Error(`Invalid stdin response: ${reply}`);
    }
  }

  private _url: string;
}
