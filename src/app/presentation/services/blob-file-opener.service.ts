// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Binds the BLOB_FILE_OPENER port to the browser download helpers in shared/helpers/file-download.helper.
 * @param blob - Binary content handed to the browser
 * @param fileName - File name of the download, also used as fallback when no tab could be opened
 */
import { Injectable } from '@angular/core';
import { IBlobFileOpener } from 'src/app/domain/interfaces/blob-file-opener.interface';
import { PendingBlobTab } from 'src/app/domain/interfaces/pending-blob-tab.interface';
import {
  openBlobInNewTab,
  openPendingBlobTab,
  triggerBlobDownload,
} from 'src/app/shared/helpers/file-download.helper';

@Injectable({ providedIn: 'root' })
export class BlobFileOpenerService implements IBlobFileOpener {
  triggerBlobDownload(blob: Blob, fileName: string): void {
    triggerBlobDownload(blob, fileName);
  }

  openBlobInNewTab(blob: Blob, fallbackFileName: string): void {
    openBlobInNewTab(blob, fallbackFileName);
  }

  openPendingBlobTab(): PendingBlobTab {
    return openPendingBlobTab();
  }
}
