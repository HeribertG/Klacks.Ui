// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { Injectable } from '@angular/core';
import { triggerBlobDownload } from 'src/app/shared/helpers/file-download.helper';

@Injectable()
export class ReportService {
  downloadPdf(blob: Blob, fileName: string): void {
    triggerBlobDownload(blob, fileName);
  }

  openPdfPreview(blob: Blob): void {
    const url = window.URL.createObjectURL(blob);
    window.open(url, '_blank');
  }
}
