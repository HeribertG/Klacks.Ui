// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { HttpClient } from '@angular/common/http';
import { TranslateLoader } from '@ngx-translate/core';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

const CORE_LANGUAGES = ['de', 'en', 'fr', 'it'];

export class KlacksTranslateLoader implements TranslateLoader {
  private readonly apiUrl: string;

  constructor(private httpClient: HttpClient) {
    this.apiUrl = environment.baseUrl.replace('backend/', '');
  }

  getTranslation(lang: string): Observable<Record<string, string>> {
    if (CORE_LANGUAGES.includes(lang)) {
      return this.httpClient.get<Record<string, string>>(`./assets/i18n/${lang}.json`);
    }

    return this.httpClient.get<Record<string, string>>(`${this.apiUrl}config/translations/${lang}`);
  }
}

export function KlacksTranslateLoaderFactory(httpClient: HttpClient): KlacksTranslateLoader {
  return new KlacksTranslateLoader(httpClient);
}
