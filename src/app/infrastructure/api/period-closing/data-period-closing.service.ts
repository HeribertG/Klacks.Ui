// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Service that wraps the PeriodClosing backend endpoints: seal/unseal,
 * sealed-period summary, audit log, and export log.
 */

import { HttpClient, HttpParams, HttpResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { retry } from 'rxjs/operators';
import { environment } from 'src/environments/environment';
import { ExportLog } from './models/export-log';
import { IOrderRangeExportFilter } from './models/order-range-export-filter';
import { ISealedOrderDetails } from './models/sealed-order-details';
import { PeriodAuditLog } from './models/period-audit-log';
import { PeriodIssue } from './models/period-issue';
import { SealedOrderListItem } from './models/sealed-order-list-item';
import { SealedPeriodSummary } from './models/sealed-period-summary';
import { SealRequest } from './models/seal-request';
import { UnsealRequest } from './models/unseal-request';
import { UsedPeriod } from './models/used-period';

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

  getUsedPeriods(): Observable<UsedPeriod[]> {
    return this.httpClient.get<UsedPeriod[]>(`${this.base}/UsedPeriods`).pipe(retry(3));
  }

  getPeriodIssues(from: string, to: string, groupId: string | null): Observable<PeriodIssue[]> {
    let params = new HttpParams().set('from', from).set('to', to);
    if (groupId) {
      params = params.set('groupId', groupId);
    }
    return this.httpClient.get<PeriodIssue[]>(`${this.base}/Issues`, { params }).pipe(retry(3));
  }

  getAuditLog(from: string, to: string): Observable<PeriodAuditLog[]> {
    const params = new HttpParams().set('from', from).set('to', to);
    return this.httpClient.get<PeriodAuditLog[]>(`${this.base}/AuditLog`, { params }).pipe(retry(3));
  }

  getExportLog(from: string, to: string): Observable<ExportLog[]> {
    const params = new HttpParams().set('from', from).set('to', to);
    return this.httpClient.get<ExportLog[]>(`${this.base}/ExportLog`, { params }).pipe(retry(3));
  }

  downloadOrderExport(request: {
    orderIds: string[];
    fromDate: string | null;
    untilDate: string | null;
    format: string;
    language: string;
    groupId: string | null;
  }): Observable<HttpResponse<Blob>> {
    return this.httpClient.post(
      `${environment.baseUrl}OrderExport`,
      request,
      { responseType: 'blob', observe: 'response' }
    );
  }

  downloadClientPeriodExport(request: {
    fromDate: string;
    untilDate: string;
    language: string;
    currencyCode: string;
    format: string;
  }): Observable<HttpResponse<Blob>> {
    return this.httpClient.post(
      `${environment.baseUrl}ClientPeriodExport`,
      request,
      { responseType: 'blob', observe: 'response' }
    );
  }

  downloadPayrollExport(request: {
    groupId: string;
    fromDate: string;
    untilDate: string;
    language: string;
    format: string;
  }): Observable<HttpResponse<Blob>> {
    return this.httpClient.post(
      `${environment.baseUrl}PayrollExport`,
      request,
      { responseType: 'blob', observe: 'response' }
    );
  }

  downloadOrderRangeExport(request: IOrderRangeExportFilter): Observable<HttpResponse<Blob>> {
    return this.httpClient.post(
      `${environment.baseUrl}OrderRangeExport`,
      request,
      { responseType: 'blob', observe: 'response' }
    );
  }

  getSealedOrderDetails(
    id: string,
    fromDate: string | null,
    untilDate: string | null
  ): Observable<ISealedOrderDetails> {
    let params = new HttpParams();
    if (fromDate) params = params.set('fromDate', fromDate);
    if (untilDate) params = params.set('untilDate', untilDate);
    return this.httpClient
      .get<ISealedOrderDetails>(`${environment.baseUrl}OrderExport/orders/${id}/details`, { params })
      .pipe(retry(3));
  }

  listSealedOrders(
    from: string | null,
    until: string | null,
    customerId: string | null,
    search: string | null
  ): Observable<SealedOrderListItem[]> {
    let params = new HttpParams();
    if (from) params = params.set('from', from);
    if (until) params = params.set('until', until);
    if (customerId) params = params.set('customerId', customerId);
    if (search) params = params.set('search', search);
    return this.httpClient
      .get<SealedOrderListItem[]>(`${environment.baseUrl}OrderExport/orders`, { params })
      .pipe(retry(3));
  }
}
