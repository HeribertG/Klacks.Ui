// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Service that fetches a bundled application asset and saves it on the user's device as a browser download.
 * @param assetPath - Application-relative path of the asset to fetch
 * @param fileName - File name offered in the browser download dialog
 * @param mimeType - MIME type of the generated download blob
 */

import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class AssetDownloadService {
  private http = inject(HttpClient);

  downloadAsset(assetPath: string, fileName: string, mimeType: string): Observable<void> {
    return this.http
      .get(assetPath, { responseType: 'text' })
      .pipe(map(content => this.saveAsFile(content, fileName, mimeType)));
  }

  private saveAsFile(content: string, fileName: string, mimeType: string): void {
    const blob = new Blob([content], { type: mimeType });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }
}
