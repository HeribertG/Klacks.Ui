// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * HTTP service for the automatically managed ERP drop point and its file store.
 * @param getDefaultDropPoint - Loads the default drop point (the backend creates it on demand)
 * @param updateDropPoint - Updates the drop point, used to toggle the import on and off
 * @param uploadFile - Uploads an XML order file into the drop point and returns the storage key
 * @param getFiles - Loads the import ledger rows grouped by tab (inbox, processed, failed); no automatic retry,
 *   the polling counts failed requests itself
 * @param retryFile - Re-queues a failed or interrupted file by its ledger id; the result carries the new status
 *   (Received, or Failed again when the stored file changed or vanished after receipt)
 * @param deleteFile - Deletes a failed or interrupted file (stored object and ledger row) by its ledger id
 * @param triggerImportRun - Triggers an immediate import run
 */

import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { retry } from 'rxjs/operators';
import { environment } from 'src/environments/environment';
import { IErpDropPoint } from 'src/app/domain/models/settings/erp-drop-point';
import { IErpDropPointFiles } from 'src/app/domain/models/settings/erp-drop-point-files.interface';
import { IErpDropPointRequest } from 'src/app/domain/models/settings/erp-drop-point-request.interface';
import { IErpOrderFileRetryResult } from 'src/app/domain/models/settings/erp-order-file-retry-result';
import { ERP_DROP_POINT_FILES_PATH } from 'src/app/domain/constants/erp-import-file.constants';

const DEFAULT_PATH_SEGMENT = 'default';
const RETRY_PATH_SEGMENT = 'retry';
const RUN_PATH_SEGMENT = 'run';
const UPLOAD_FORM_FIELD = 'file';

@Injectable({
  providedIn: 'root',
})
export class DataErpDropPointService {
  private httpClient = inject(HttpClient);
  private readonly apiUrl = `${environment.baseUrl}ErpDropPoints`;
  private readonly filesUrl = `${environment.baseUrl}${ERP_DROP_POINT_FILES_PATH}`;

  getDefaultDropPoint(): Observable<IErpDropPoint> {
    return this.httpClient
      .get<IErpDropPoint>(`${this.apiUrl}/${DEFAULT_PATH_SEGMENT}`)
      .pipe(retry(3));
  }

  updateDropPoint(id: string, request: IErpDropPointRequest): Observable<IErpDropPoint> {
    return this.httpClient
      .put<IErpDropPoint>(`${this.apiUrl}/${id}`, request)
      .pipe(retry(3));
  }

  uploadFile(file: File): Observable<{ key: string }> {
    const formData = new FormData();
    formData.append(UPLOAD_FORM_FIELD, file);
    return this.httpClient
      .post<{ key: string }>(this.filesUrl, formData);
  }

  getFiles(): Observable<IErpDropPointFiles> {
    return this.httpClient.get<IErpDropPointFiles>(this.filesUrl);
  }

  retryFile(id: string): Observable<IErpOrderFileRetryResult> {
    return this.httpClient
      .post<IErpOrderFileRetryResult>(`${this.filesUrl}/${encodeURIComponent(id)}/${RETRY_PATH_SEGMENT}`, null);
  }

  deleteFile(id: string): Observable<void> {
    return this.httpClient
      .delete<void>(`${this.filesUrl}/${encodeURIComponent(id)}`);
  }

  triggerImportRun(): Observable<void> {
    return this.httpClient
      .post<void>(`${this.apiUrl}/${RUN_PATH_SEGMENT}`, null);
  }
}
