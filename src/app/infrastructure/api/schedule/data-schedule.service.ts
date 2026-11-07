// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { inject, Injectable } from '@angular/core';
import { Work } from 'src/app/domain/models/schedule/schedule-class';
import { IWork } from 'src/app/domain/models/schedule/work.interface';
import { environment } from 'src/environments/environment';
import { defer, retry } from 'rxjs';
import { toCalendarDateWire } from 'src/app/domain/helpers/calendar-date.helper';
import { retryTransientHttpErrors } from 'src/app/infrastructure/helpers/http-retry.helper';
import { idempotentRequestOptions } from 'src/app/infrastructure/helpers/idempotency-key.helper';
import { IdenticalCreateGuardService } from 'src/app/infrastructure/helpers/identical-create-guard.service';
import { HttpClient } from '@angular/common/http';
import { BulkDeleteWorksRequest } from 'src/app/domain/models/dtos/bulk-delete-works-request.dto';
import { BulkAddWorksRequest } from 'src/app/domain/models/dtos/bulk-add-works-request.dto';
import { BulkWorksResponse } from 'src/app/domain/models/dtos/bulk-works-response.dto';
import { ReassignWorkClientResponse } from 'src/app/domain/models/dtos/reassign-work-client-response.dto';

@Injectable({
  providedIn: 'root',
})
export class DataScheduleService {
  private httpClient = inject(HttpClient);
  private identicalCreateGuard = inject(IdenticalCreateGuardService);

  getWork(id: string) {
    return this.httpClient
      .get<IWork>(`${environment.baseUrl}Works/${id}`)
      .pipe(retry(3));
  }

  addWork(value: Work) {
    const options = idempotentRequestOptions();
    const url = `${environment.baseUrl}Works/`;
    return defer(() => {
      const payload = this.toWirePayload(value);
      return this.identicalCreateGuard.run(url, payload, () => this.httpClient
        .post<IWork>(url, payload, options)
        .pipe(retryTransientHttpErrors()));
    });
  }

  updateWork(value: Work) {
    return defer(() => this.httpClient
      .put<IWork>(`${environment.baseUrl}Works/`, this.toWirePayload(value))
      .pipe(retryTransientHttpErrors()));
  }

  reassignWorkClient(id: string, targetClientId: string) {
    return this.httpClient
      .post<ReassignWorkClientResponse>(`${environment.baseUrl}Works/${id}/ReassignClient`, { targetClientId })
      .pipe(retryTransientHttpErrors());
  }

  deleteWork(id: string, periodStart: string, periodEnd: string) {
    return this.httpClient
      .delete<IWork>(`${environment.baseUrl}Works/${id}?periodStart=${periodStart}&periodEnd=${periodEnd}`)
      .pipe(retry(3));
  }

  bulkDeleteWorks(workIds: string[]) {
    const request: BulkDeleteWorksRequest = { workIds };
    return this.httpClient
      .delete<BulkWorksResponse>(`${environment.baseUrl}Works/Bulk`, { body: request })
      .pipe(retry(3));
  }

  bulkAddWorks(request: BulkAddWorksRequest) {
    return this.httpClient
      .post<BulkWorksResponse>(`${environment.baseUrl}Works/Bulk`, request, idempotentRequestOptions())
      .pipe(retryTransientHttpErrors());
  }

  restoreWork(id: string) {
    return this.httpClient
      .post<IWork>(`${environment.baseUrl}Works/${id}/Restore`, {})
      .pipe(retryTransientHttpErrors());
  }

  confirmWork(workId: string) {
    return this.httpClient
      .post<IWork>(`${environment.baseUrl}Works/${workId}/Confirm`, {})
      .pipe(retryTransientHttpErrors());
  }

  unconfirmWork(workId: string) {
    return this.httpClient
      .post<IWork>(`${environment.baseUrl}Works/${workId}/Unconfirm`, {})
      .pipe(retryTransientHttpErrors());
  }

  approveDay(date: string, groupId: string) {
    return this.httpClient
      .post<number>(`${environment.baseUrl}Works/ApproveDay`, { date, groupId })
      .pipe(retryTransientHttpErrors());
  }

  revokeDayApproval(date: string, groupId: string) {
    return this.httpClient
      .post<number>(`${environment.baseUrl}Works/RevokeDayApproval`, { date, groupId })
      .pipe(retryTransientHttpErrors());
  }

  closePeriod(startDate: string, endDate: string) {
    return this.httpClient
      .post<number>(`${environment.baseUrl}Works/ClosePeriod`, { startDate, endDate })
      .pipe(retryTransientHttpErrors());
  }

  reopenPeriod(startDate: string, endDate: string) {
    return this.httpClient
      .post<number>(`${environment.baseUrl}Works/ReopenPeriod`, { startDate, endDate })
      .pipe(retry(3));
  }

  private toWirePayload(value: Work) {
    return { ...value, currentDate: toCalendarDateWire(value.currentDate) };
  }
}
