// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * HTTP client for the export format override admin endpoints (list, save, delete, preview download).
 * @param formatKey - Export format identifier the override applies to
 * @param request - Patch JSON, enabled flag and support note to store
 * @param patchJson - JSON patch to preview; null renders the stored override or the default
 */
import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

export const ExportFormatFamilies = {
  Order: 'order',
  Payroll: 'payroll',
  ClientPeriod: 'clientperiod',
} as const;

export type ExportFormatFamily = (typeof ExportFormatFamilies)[keyof typeof ExportFormatFamilies];

export interface IExportFormatOverride {
  formatKey: string;
  patchJson: string;
  isEnabled: boolean;
  note: string | null;
  createdUnderVersion: string;
  updateTime: string | null;
}

export interface IExportFormatOverrideEntry {
  formatKey: string;
  family: ExportFormatFamily;
  allowedKeys: string[];
  override: IExportFormatOverride | null;
}

export interface IExportFormatOverridesResponse {
  currentVersion: string;
  formats: IExportFormatOverrideEntry[];
}

export interface IExportFormatOverrideSaveRequest {
  patchJson: string;
  isEnabled: boolean;
  note: string | null;
}

export interface IExportFormatOverridePreviewRequest {
  patchJson: string | null;
}

const PREVIEW_SEGMENT = 'preview';

@Injectable({
  providedIn: 'root',
})
export class DataExportFormatOverridesService {
  private httpClient = inject(HttpClient);
  private readonly baseUrl = `${environment.baseUrl}exportformatoverrides`;

  getOverrides(): Observable<IExportFormatOverridesResponse> {
    return this.httpClient.get<IExportFormatOverridesResponse>(this.baseUrl);
  }

  saveOverride(
    formatKey: string,
    request: IExportFormatOverrideSaveRequest
  ): Observable<IExportFormatOverride> {
    return this.httpClient.put<IExportFormatOverride>(`${this.baseUrl}/${formatKey}`, request);
  }

  deleteOverride(formatKey: string): Observable<void> {
    return this.httpClient.delete<void>(`${this.baseUrl}/${formatKey}`);
  }

  downloadPreview(formatKey: string, patchJson: string | null): Observable<HttpResponse<Blob>> {
    const request: IExportFormatOverridePreviewRequest = { patchJson };
    return this.httpClient.post(`${this.baseUrl}/${formatKey}/${PREVIEW_SEGMENT}`, request, {
      responseType: 'blob',
      observe: 'response',
    });
  }
}
