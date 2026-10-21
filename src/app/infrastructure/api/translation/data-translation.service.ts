// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable, retry } from 'rxjs';
import { TranslationRequest } from './translation-request.interface';
import { TranslationResponse } from './translation-response.interface';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root',
})
export class DataTranslationService {
  private httpClient = inject(HttpClient);

  getStatus(): Observable<boolean> {
    return this.httpClient.get<boolean>(`${environment.baseUrl}Translation/status`).pipe(retry(3));
  }

  translateToAll(text: string, sourceLanguage: string): Observable<TranslationResponse> {
    const request: TranslationRequest = { text, sourceLanguage };
    return this.httpClient.post<TranslationResponse>(
      `${environment.baseUrl}Translation/translate-all`,
      request
    ).pipe(retry(3));
  }
}
