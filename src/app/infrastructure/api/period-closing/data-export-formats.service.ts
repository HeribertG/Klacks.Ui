// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Service that reads the available order export formats and their enabled state
 * from the backend, so the export dropdown and the settings card stay in sync
 * with the registered formatters and the ENABLED_EXPORT_FORMATS setting.
 */

import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { retry } from 'rxjs/operators';
import { environment } from 'src/environments/environment';
import { ExportFormatResource } from './models/export-format-resource';

@Injectable({ providedIn: 'root' })
export class DataExportFormatsService {
  private httpClient = inject(HttpClient);
  private readonly base = `${environment.baseUrl}OrderExport`;

  getFormats(): Observable<ExportFormatResource[]> {
    return this.httpClient.get<ExportFormatResource[]>(`${this.base}/formats`).pipe(retry(3));
  }
}
