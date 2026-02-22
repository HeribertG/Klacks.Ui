// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { retry } from 'rxjs';
import { environment } from 'src/environments/environment';
import { IBreak, Break } from 'src/app/domain/models/break/break-class';
import { BulkAddBreaksRequest } from '../dtos/bulk-add-breaks-request.dto';
import { BulkDeleteBreaksRequest } from '../dtos/bulk-delete-breaks-request.dto';
import { BulkBreaksResponse } from '../dtos/bulk-breaks-response.dto';

@Injectable({
  providedIn: 'root',
})
export class DataBreakService {
  private httpClient = inject(HttpClient);

  getBreak(id: string) {
    return this.httpClient
      .get<IBreak>(`${environment.baseUrl}Breaks/${id}`)
      .pipe(retry(3));
  }

  addBreak(value: Break) {
    return this.httpClient
      .post<IBreak>(`${environment.baseUrl}Breaks/`, value)
      .pipe(retry(3));
  }

  updateBreak(value: Break) {
    return this.httpClient
      .put<IBreak>(`${environment.baseUrl}Breaks/`, value)
      .pipe(retry(3));
  }

  deleteBreak(id: string, periodStart: string, periodEnd: string) {
    return this.httpClient
      .delete<IBreak>(`${environment.baseUrl}Breaks/${id}?periodStart=${periodStart}&periodEnd=${periodEnd}`)
      .pipe(retry(3));
  }

  bulkAddBreaks(request: BulkAddBreaksRequest) {
    return this.httpClient
      .post<BulkBreaksResponse>(`${environment.baseUrl}Breaks/Bulk`, request)
      .pipe(retry(3));
  }

  bulkDeleteBreaks(request: BulkDeleteBreaksRequest) {
    return this.httpClient
      .delete<BulkBreaksResponse>(`${environment.baseUrl}Breaks/Bulk`, { body: request })
      .pipe(retry(3));
  }

  confirmBreak(breakId: string) {
    return this.httpClient
      .post<IBreak>(`${environment.baseUrl}Breaks/${breakId}/Confirm`, {})
      .pipe(retry(3));
  }

  unconfirmBreak(breakId: string) {
    return this.httpClient
      .post<IBreak>(`${environment.baseUrl}Breaks/${breakId}/Unconfirm`, {})
      .pipe(retry(3));
  }
}
