import { ContentsAPI, DriveFS, ServiceWorkerContentsAPI } from '@jupyterlite/contents';

/**
 * Custom drive implementation using the service worker
 */
export class CockleDriveFS extends DriveFS {
  createAPI(options: DriveFS.IOptions): ContentsAPI {
    return new ServiceWorkerContentsAPI(
      options.baseUrl,
      options.driveName,
      options.mountpoint,
      options.FS,
      options.ERRNO_CODES
    );
  }
}
