// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { HttpClient } from '@angular/common/http';
import { TranslateLoader } from '@ngx-translate/core';
import { Observable, forkJoin, map, of, catchError } from 'rxjs';
import { getApiRootUrl } from 'src/app/infrastructure/helpers/api-root-url.helper';
import { DomainMessages } from 'src/app/domain/constants/messages';

const CORE_LANGUAGES = ['de', 'en', 'fr', 'it'];
const FALLBACK_LANGUAGE = DomainMessages.DEFAULT_LANG;
const BUILD_QUERY_PARAMETER = '?v=';

/**
 * Loads the UI texts: the core language files shipped with the bundle plus the texts of installed plugins. The core
 * file URL carries the build key of the running bundle, because the file keeps its name across releases: a browser
 * that still holds the file of an older build at the same address would otherwise show raw keys for texts added
 * since then.
 * @param httpClient - HTTP client for the static files and the plugin texts endpoint
 * @param buildKey - Identity of the running build; when given, it is appended to the core file URL
 */
export class KlacksTranslateLoader implements TranslateLoader {
  private readonly apiUrl: string;
  private readonly coreFileQuery: string;

  constructor(private httpClient: HttpClient, buildKey?: string) {
    this.apiUrl = getApiRootUrl();
    this.coreFileQuery = buildKey ? `${BUILD_QUERY_PARAMETER}${encodeURIComponent(buildKey)}` : '';
  }

  getTranslation(lang: string): Observable<Record<string, string>> {
    const featurePluginTranslations$ = this.httpClient
      .get<Record<string, string>>(`${this.apiUrl}config/translations/${lang}`)
      .pipe(catchError(() => of({})));

    if (CORE_LANGUAGES.includes(lang)) {
      return forkJoin({
        core: this.httpClient.get<Record<string, string>>(`./assets/i18n/${lang}.json${this.coreFileQuery}`),
        plugins: featurePluginTranslations$,
      }).pipe(
        map(({ core, plugins }) => ({ ...core, ...plugins }))
      );
    }

    return forkJoin({
      base: this.httpClient.get<Record<string, string>>(`./assets/i18n/${FALLBACK_LANGUAGE}.json${this.coreFileQuery}`),
      plugin: featurePluginTranslations$,
    }).pipe(
      map(({ base, plugin }) => ({ ...base, ...plugin }))
    );
  }
}

export function KlacksTranslateLoaderFactory(httpClient: HttpClient, buildKey?: string): KlacksTranslateLoader {
  return new KlacksTranslateLoader(httpClient, buildKey);
}
