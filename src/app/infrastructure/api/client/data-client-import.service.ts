// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * HTTP service for the employee import endpoints. None of the calls retries: a repeated upload would
 * re-send up to 5 MB, and a repeated commit would hit the token's unique index and report a failure
 * for an import that actually succeeded.
 * @param parse - Uploads the file (optionally for a specific sheet) and returns the raw grid with the detected mapping
 * @param preview - Runs the transformation and validation for the given request without writing anything
 * @param commit - Writes all ready rows in one transaction and returns the created/skipped counts
 * @param downloadTemplate - Loads the xlsx template with column headers in the requested language; the file name
 *   comes from the Content-Disposition header when the browser may read it (same origin), otherwise it is built
 *   like the backend does (klacks-employee-import-<language>.xlsx)
 */

import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpContext, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from 'src/environments/environment';
import {
  CLIENT_IMPORT_API_SEGMENT,
  CLIENT_IMPORT_COMMIT_PATH,
  CLIENT_IMPORT_FILE_FORM_FIELD,
  CLIENT_IMPORT_LANGUAGE_PARAM,
  CLIENT_IMPORT_PARSE_PATH,
  CLIENT_IMPORT_PREVIEW_PATH,
  CLIENT_IMPORT_SHEET_FORM_FIELD,
  CLIENT_IMPORT_TEMPLATE_FILE_EXTENSION,
  CLIENT_IMPORT_TEMPLATE_FILE_NAME_PREFIX,
  CLIENT_IMPORT_TEMPLATE_PATH,
} from 'src/app/domain/constants/client-import.constants';
import { SKIP_LOADING } from 'src/app/domain/constants/http-context.constants';
import { IClientImportParseResult } from 'src/app/domain/models/client-import/i-client-import-parse-result';
import { IClientImportRequest } from 'src/app/domain/models/client-import/i-client-import-request';
import { IClientImportPreviewResult } from 'src/app/domain/models/client-import/i-client-import-preview-result';
import { IClientImportCommitResult } from 'src/app/domain/models/client-import/i-client-import-commit-result';
import { IClientImportTemplateFile } from 'src/app/domain/models/client-import/i-client-import-template-file';
import {
  CONTENT_DISPOSITION_HEADER,
  extractFileNameFromContentDisposition,
} from 'src/app/shared/helpers/file-download.helper';

@Injectable({
  providedIn: 'root',
})
export class DataClientImportService {
  private httpClient = inject(HttpClient);
  private readonly apiUrl = `${environment.baseUrl}${CLIENT_IMPORT_API_SEGMENT}`;

  parse(file: File, sheetName?: string | null): Observable<IClientImportParseResult> {
    const formData = new FormData();
    formData.append(CLIENT_IMPORT_FILE_FORM_FIELD, file);
    if (sheetName) {
      formData.append(CLIENT_IMPORT_SHEET_FORM_FIELD, sheetName);
    }
    return this.httpClient.post<IClientImportParseResult>(
      `${this.apiUrl}/${CLIENT_IMPORT_PARSE_PATH}`,
      formData,
    );
  }

  preview(request: IClientImportRequest): Observable<IClientImportPreviewResult> {
    return this.httpClient.post<IClientImportPreviewResult>(
      `${this.apiUrl}/${CLIENT_IMPORT_PREVIEW_PATH}`,
      request,
      { context: new HttpContext().set(SKIP_LOADING, true) },
    );
  }

  commit(request: IClientImportRequest): Observable<IClientImportCommitResult> {
    return this.httpClient.post<IClientImportCommitResult>(
      `${this.apiUrl}/${CLIENT_IMPORT_COMMIT_PATH}`,
      request,
    );
  }

  downloadTemplate(language: string): Observable<IClientImportTemplateFile> {
    const params = new HttpParams().set(CLIENT_IMPORT_LANGUAGE_PARAM, language);
    return this.httpClient
      .get(`${this.apiUrl}/${CLIENT_IMPORT_TEMPLATE_PATH}`, {
        params,
        responseType: 'blob',
        observe: 'response',
      })
      .pipe(
        map((response) => ({
          blob: response.body as Blob,
          fileName:
            extractFileNameFromContentDisposition(response.headers.get(CONTENT_DISPOSITION_HEADER)) ??
            `${CLIENT_IMPORT_TEMPLATE_FILE_NAME_PREFIX}${language}${CLIENT_IMPORT_TEMPLATE_FILE_EXTENSION}`,
        })),
      );
  }
}
