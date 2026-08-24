// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Delivers a generated report PDF, either as a download, as an embedded preview or in a new tab.
 * @param blob - Generated PDF
 * @param fileName - File name used for the download
 * @param url - Object URL created by createPreviewUrl and released again by revokePreviewUrl
 */

import { Injectable } from '@angular/core';
import { openBlobInNewTab, triggerBlobDownload } from 'src/app/shared/helpers/file-download.helper';

const FALLBACK_FILE_NAME = 'report.pdf';

@Injectable()
export class ReportService {
  downloadPdf(blob: Blob, fileName: string): void {
    triggerBlobDownload(blob, fileName);
  }

  downloadJson(content: string, fileName: string): void {
    triggerBlobDownload(new Blob([content], { type: 'application/json' }), fileName);
  }

  downloadCsv(blob: Blob, fileName: string): void {
    triggerBlobDownload(blob, fileName);
  }

  downloadXlsx(blob: Blob, fileName: string): void {
    triggerBlobDownload(blob, fileName);
  }

  createPreviewUrl(blob: Blob): string {
    return window.URL.createObjectURL(blob);
  }

  revokePreviewUrl(url: string | null): void {
    if (url) {
      window.URL.revokeObjectURL(url);
    }
  }

  openPdfPreview(blob: Blob, fileName: string = FALLBACK_FILE_NAME): void {
    openBlobInNewTab(blob, fileName);
  }
}
