// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, retry } from 'rxjs';
import { environment } from 'src/environments/environment';
import { LanguageConfigResponse } from 'src/app/domain/models/settings/language-config';

@Injectable({
  providedIn: 'root',
})
export class DataLanguageConfigService {
  private httpClient = inject(HttpClient);

  private readonly apiUrl = environment.baseUrl.replace('backend/', '');

  getLanguageConfig(): Observable<LanguageConfigResponse> {
    return this.httpClient.get<LanguageConfigResponse>(`${this.apiUrl}config/languages`).pipe(retry(3));
  }
}
