// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Service that wraps the PeriodClosing backend endpoints: seal/unseal,
 * sealed-period summary, audit log, and export log.
 */

import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { retry } from 'rxjs/operators';
import { environment } from 'src/environments/environment';
import { ExportLog } from './models/export-log';
import { PeriodAuditLog } from './models/period-audit-log';
import { SealedPeriodSummary } from './models/sealed-period-summary';
import { SealRequest } from './models/seal-request';
import { UnsealRequest } from './models/unseal-request';

@Injectable({ providedIn: 'root' })
export class DataPeriodClosingService {
  private httpClient = inject(HttpClient);
  private readonly base = `${environment.baseUrl}PeriodClosing`;

  seal(request: SealRequest): Observable<number> {
    return this.httpClient.post<number>(`${this.base}/Seal`, request).pipe(retry(3));
  }

  unseal(request: UnsealRequest): Observable<number> {
    return this.httpClient.post<number>(`${this.base}/Unseal`, request).pipe(retry(3));
  }

  getSealedPeriods(from: string, to: string, groupId: string | null): Observable<SealedPeriodSummary[]> {
    let params = new HttpParams().set('from', from).set('to', to);
    if (groupId) {
      params = params.set('groupId', groupId);
    }
    return this.httpClient.get<SealedPeriodSummary[]>(`${this.base}/SealedPeriods`, { params }).pipe(retry(3));
  }

  getAuditLog(from: string, to: string): Observable<PeriodAuditLog[]> {
    const params = new HttpParams().set('from', from).set('to', to);
    return this.httpClient.get<PeriodAuditLog[]>(`${this.base}/AuditLog`, { params }).pipe(retry(3));
  }

  getExportLog(from: string, to: string): Observable<ExportLog[]> {
    const params = new HttpParams().set('from', from).set('to', to);
    return this.httpClient.get<ExportLog[]>(`${this.base}/ExportLog`, { params }).pipe(retry(3));
  }
}
