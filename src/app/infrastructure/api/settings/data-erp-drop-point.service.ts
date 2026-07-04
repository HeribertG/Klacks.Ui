// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * HTTP service for the automatically managed ERP drop point and its file store.
 * @param getDefaultDropPoint - Loads the default drop point (the backend creates it on demand)
 * @param updateDropPoint - Updates the drop point, used to toggle the import on and off
 * @param uploadFile - Uploads an XML order file into the drop point and returns the storage key
 * @param getFiles - Loads the stored files grouped by state (pending, processed, error)
 * @param retryFile - Moves a failed file back into the inbox so the next run imports it again
 * @param deleteFile - Permanently removes a failed file from the error segment
 * @param triggerImportRun - Triggers an immediate import run
 */

import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { retry } from 'rxjs/operators';
import { environment } from 'src/environments/environment';
import {
  IErpDropPoint,
  IErpDropPointFiles,
  IErpDropPointRequest,
} from 'src/app/domain/models/settings/erp-drop-point';

const DEFAULT_PATH_SEGMENT = 'default';
const FILES_PATH_SEGMENT = 'files';
const RETRY_PATH_SEGMENT = 'retry';
const RUN_PATH_SEGMENT = 'run';
const UPLOAD_FORM_FIELD = 'file';

@Injectable({
  providedIn: 'root',
})
export class DataErpDropPointService {
  private httpClient = inject(HttpClient);
  private readonly apiUrl = `${environment.baseUrl}ErpDropPoints`;

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
      .post<{ key: string }>(`${this.apiUrl}/${FILES_PATH_SEGMENT}`, formData);
  }

  getFiles(): Observable<IErpDropPointFiles> {
    return this.httpClient
      .get<IErpDropPointFiles>(`${this.apiUrl}/${FILES_PATH_SEGMENT}`)
      .pipe(retry(3));
  }

  retryFile(key: string): Observable<void> {
    return this.httpClient
      .post<void>(`${this.apiUrl}/${FILES_PATH_SEGMENT}/${RETRY_PATH_SEGMENT}`, { key });
  }

  deleteFile(key: string): Observable<void> {
    return this.httpClient
      .delete<void>(`${this.apiUrl}/${FILES_PATH_SEGMENT}`, { body: { key } });
  }

  triggerImportRun(): Observable<void> {
    return this.httpClient
      .post<void>(`${this.apiUrl}/${RUN_PATH_SEGMENT}`, null);
  }
}
