// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Browser access for layers that must not depend on shared or the DOM (domain services, application use cases):
 * hands a generated blob to the browser as a download, in a new tab, or in a tab opened synchronously inside the
 * user's click, and the token through which it is provided.
 * @param triggerBlobDownload - Starts a browser download of the blob under the given file name
 * @param openBlobInNewTab - Opens the blob in a new tab, falling back to a download under fallbackFileName
 * @param openPendingBlobTab - Opens an empty tab now and returns the handle that fills or closes it later
 */
import { InjectionToken } from '@angular/core';
import { PendingBlobTab } from './pending-blob-tab.interface';

export interface IBlobFileOpener {
  triggerBlobDownload(blob: Blob, fileName: string): void;
  openBlobInNewTab(blob: Blob, fallbackFileName: string): void;
  openPendingBlobTab(): PendingBlobTab;
}

export const BLOB_FILE_OPENER = new InjectionToken<IBlobFileOpener>('IBlobFileOpener');
