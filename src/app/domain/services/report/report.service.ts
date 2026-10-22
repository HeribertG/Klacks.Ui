// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Delivers a generated report PDF, either as a download, as an embedded preview or in a new tab.
 * @param blob - Generated PDF
 * @param fileName - File name used for the download
 * @param url - Object URL created by createPreviewUrl and released again by revokePreviewUrl
 */

import { inject, Injectable } from '@angular/core';
import { BLOB_FILE_OPENER } from 'src/app/domain/interfaces/blob-file-opener.interface';
import { PendingBlobTab } from 'src/app/domain/interfaces/pending-blob-tab.interface';

const FALLBACK_FILE_NAME = 'report.pdf';

@Injectable()
export class ReportService {
  private blobFileOpener = inject(BLOB_FILE_OPENER);

  downloadPdf(blob: Blob, fileName: string): void {
    this.blobFileOpener.triggerBlobDownload(blob, fileName);
  }

  downloadJson(content: string, fileName: string): void {
    this.blobFileOpener.triggerBlobDownload(new Blob([content], { type: 'application/json' }), fileName);
  }

  downloadCsv(blob: Blob, fileName: string): void {
    this.blobFileOpener.triggerBlobDownload(blob, fileName);
  }

  downloadXlsx(blob: Blob, fileName: string): void {
    this.blobFileOpener.triggerBlobDownload(blob, fileName);
  }

  createPreviewUrl(blob: Blob): string {
    return window.URL.createObjectURL(blob);
  }

  revokePreviewUrl(url: string | null): void {
    if (url) {
      window.URL.revokeObjectURL(url);
    }
  }

  openPendingPdfTab(): PendingBlobTab {
    return this.blobFileOpener.openPendingBlobTab();
  }

  openPdfPreview(blob: Blob, fileName: string = FALLBACK_FILE_NAME): void {
    this.blobFileOpener.openBlobInNewTab(blob, fileName);
  }
}
