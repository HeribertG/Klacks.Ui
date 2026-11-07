// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { defer, retry } from 'rxjs';
import { environment } from 'src/environments/environment';
import { Break } from 'src/app/domain/models/break/break-class';
import { IBreak } from 'src/app/domain/models/break/break.interface';
import { toCalendarDateWire } from 'src/app/domain/helpers/calendar-date.helper';
import { BulkAddBreaksRequest } from 'src/app/domain/models/dtos/bulk-add-breaks-request.dto';
import { BulkDeleteBreaksRequest } from 'src/app/domain/models/dtos/bulk-delete-breaks-request.dto';
import { BulkBreaksResponse } from 'src/app/domain/models/dtos/bulk-breaks-response.dto';
import { RemovableWork } from 'src/app/domain/models/dtos/removable-work.dto';
import { idempotentRequestOptions } from 'src/app/infrastructure/helpers/idempotency-key.helper';
import { IdenticalCreateGuardService } from 'src/app/infrastructure/helpers/identical-create-guard.service';

@Injectable({
  providedIn: 'root',
})
export class DataBreakService {
  private httpClient = inject(HttpClient);
  private identicalCreateGuard = inject(IdenticalCreateGuardService);

  getBreak(id: string) {
    return this.httpClient
      .get<IBreak>(`${environment.baseUrl}Breaks/${id}`)
      .pipe(retry(3));
  }

  addBreak(value: Break) {
    const options = idempotentRequestOptions();
    const url = `${environment.baseUrl}Breaks/`;
    return defer(() => {
      const payload = this.toWirePayload(value);
      return this.identicalCreateGuard.run(url, payload, () => this.httpClient.post<IBreak>(url, payload, options));
    });
  }

  updateBreak(value: Break) {
    return defer(() => this.httpClient
      .put<IBreak>(`${environment.baseUrl}Breaks/`, this.toWirePayload(value))
      .pipe(retry(3)));
  }

  deleteBreak(id: string, periodStart: string, periodEnd: string) {
    return this.httpClient
      .delete<IBreak>(`${environment.baseUrl}Breaks/${id}?periodStart=${periodStart}&periodEnd=${periodEnd}`)
      .pipe(retry(3));
  }

  previewTakenWorks(request: BulkAddBreaksRequest) {
    return this.httpClient
      .post<RemovableWork[]>(`${environment.baseUrl}Breaks/Bulk/Preview`, request)
      .pipe(retry(3));
  }

  bulkAddBreaks(request: BulkAddBreaksRequest) {
    return this.httpClient
      .post<BulkBreaksResponse>(`${environment.baseUrl}Breaks/Bulk`, request, idempotentRequestOptions());
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

  private toWirePayload(value: Break) {
    return { ...value, currentDate: toCalendarDateWire(value.currentDate) };
  }
}
