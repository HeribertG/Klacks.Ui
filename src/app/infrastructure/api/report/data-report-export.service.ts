// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Sends a resolved report to the backend so it can be turned into a spreadsheet.
 * @param request - Sheets, columns and already resolved rows of the report
 */

import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from 'src/environments/environment';
import { ReportXlsxRequest } from 'src/app/domain/models/report/report-xlsx.model';

const XLSX_ENDPOINT = 'reportexport/xlsx';

@Injectable({ providedIn: 'root' })
export class DataReportExportService {
  private http = inject(HttpClient);

  async downloadXlsx(request: ReportXlsxRequest): Promise<Blob> {
    return firstValueFrom(
      this.http.post(`${environment.baseUrl}${XLSX_ENDPOINT}`, request, { responseType: 'blob' })
    );
  }
}
