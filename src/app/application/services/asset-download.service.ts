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
import { triggerBlobDownload } from 'src/app/shared/helpers/file-download.helper';

@Injectable({ providedIn: 'root' })
export class AssetDownloadService {
  private http = inject(HttpClient);

  downloadAsset(assetPath: string, fileName: string, mimeType: string): Observable<void> {
    return this.http
      .get(assetPath, { responseType: 'text' })
      .pipe(map(content => triggerBlobDownload(new Blob([content], { type: mimeType }), fileName)));
  }
}
