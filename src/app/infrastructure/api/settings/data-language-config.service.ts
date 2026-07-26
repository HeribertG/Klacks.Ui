// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, retry } from 'rxjs';
import { getApiRootUrl } from 'src/app/infrastructure/helpers/api-root-url.helper';
import { LanguageConfigResponse } from 'src/app/domain/models/settings/language-config';

@Injectable({
  providedIn: 'root',
})
export class DataLanguageConfigService {
  private httpClient = inject(HttpClient);

  private readonly apiUrl = getApiRootUrl();

  getLanguageConfig(): Observable<LanguageConfigResponse> {
    return this.httpClient.get<LanguageConfigResponse>(`${this.apiUrl}config/languages`).pipe(retry(3));
  }
}
