// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

export interface TranslationRequest {
  text: string;
  sourceLanguage: string;
}

export interface TranslationResponse {
  de: string;
  en: string;
  fr: string;
  it: string;
}

@Injectable({
  providedIn: 'root',
})
export class DataTranslationService {
  private httpClient = inject(HttpClient);

  getStatus(): Observable<boolean> {
    return this.httpClient.get<boolean>(`${environment.baseUrl}Translation/status`);
  }

  translateToAll(text: string, sourceLanguage: string): Observable<TranslationResponse> {
    const request: TranslationRequest = { text, sourceLanguage };
    return this.httpClient.post<TranslationResponse>(
      `${environment.baseUrl}Translation/translate-all`,
      request
    );
  }
}
