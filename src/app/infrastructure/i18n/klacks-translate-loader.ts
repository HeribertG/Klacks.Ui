// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { HttpClient } from '@angular/common/http';
import { TranslateLoader } from '@ngx-translate/core';
import { Observable, forkJoin, map, of, catchError } from 'rxjs';
import { environment } from 'src/environments/environment';
import { DomainMessages } from 'src/app/domain/constants/messages';

const CORE_LANGUAGES = ['de', 'en', 'fr', 'it'];
const FALLBACK_LANGUAGE = DomainMessages.DEFAULT_LANG;

export class KlacksTranslateLoader implements TranslateLoader {
  private readonly apiUrl: string;

  constructor(private httpClient: HttpClient) {
    this.apiUrl = environment.baseUrl.replace('backend/', '');
  }

  getTranslation(lang: string): Observable<Record<string, string>> {
    const featurePluginTranslations$ = this.httpClient
      .get<Record<string, string>>(`${this.apiUrl}config/translations/${lang}`)
      .pipe(catchError(() => of({})));

    if (CORE_LANGUAGES.includes(lang)) {
      return forkJoin({
        core: this.httpClient.get<Record<string, string>>(`./assets/i18n/${lang}.json`),
        plugins: featurePluginTranslations$,
      }).pipe(
        map(({ core, plugins }) => ({ ...core, ...plugins }))
      );
    }

    return forkJoin({
      base: this.httpClient.get<Record<string, string>>(`./assets/i18n/${FALLBACK_LANGUAGE}.json`),
      plugin: featurePluginTranslations$,
    }).pipe(
      map(({ base, plugin }) => ({ ...base, ...plugin }))
    );
  }
}

export function KlacksTranslateLoaderFactory(httpClient: HttpClient): KlacksTranslateLoader {
  return new KlacksTranslateLoader(httpClient);
}
