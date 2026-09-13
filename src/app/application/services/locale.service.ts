// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Service managing the active locale for the application. Initializes from the browser
 * language, mapped onto a supported application language (see SUPPORTED_APP_LANGUAGES).
 *
 * Use switchLocale() to change the language at runtime: it loads the Angular locale data
 * first and only then flips the locale signal, so no consumer ever reads a locale whose
 * data is missing (NG0701). If the locale data chunk cannot be loaded (offline, stale chunk
 * after a deployment) the failure is logged and the locale signal only flips for the four
 * eagerly registered core languages, so consumers never end up without locale data.
 * setLocale() is the raw setter and does NOT load locale data;
 * it exists for tests and internal wiring only and must not be used from UI code.
 *
 * LOCALE_ID is frozen at bootstrap (resolved once from getLocale()) and the language switch in
 * nav/profile does not reload the application, so LOCALE_ID must not be used to render dates.
 * Every date formatter reads the active language from this service instead: the calendarDate and
 * companyDateTime pipes, the ngb date parser/formatter and the imperative callers (reports, PDF
 * exports, validation messages). The calendarDate and companyDateTime pipes are impure and
 * memoized, so an already rendered cell re-formats on the next change-detection run after a
 * switch. Angular's own DatePipe without an explicit locale argument still keeps the bootstrap
 * language.
 *
 * @param locale - Active application language code, e.g. 'de', 'es' or 'zh-TW'.
 */
import { Injectable, inject, signal } from '@angular/core';

import { DomainMessages } from 'src/app/domain/constants/messages';
import {
  EAGERLY_REGISTERED_LANGUAGES,
  LocaleDataLoaderService,
  SUPPORTED_APP_LANGUAGES,
} from 'src/app/application/services/locale-data-loader.service';

const CANONICAL_BY_LOWERCASE: ReadonlyMap<string, string> = new Map(
  SUPPORTED_APP_LANGUAGES.map((code) => [code.toLowerCase(), code])
);

const SCRIPT_FALLBACKS: Readonly<Record<string, string>> = {
  'zh-hans': 'zh-CN',
  'zh-hant': 'zh-TW',
};

const BASE_FALLBACKS: Readonly<Record<string, string>> = {
  zh: 'zh-CN',
};

@Injectable({ providedIn: 'root' })
export class LocaleService {
  private localeDataLoader = inject(LocaleDataLoaderService);

  public locale = signal<string>(LocaleService.detectBrowserLanguage());

  setLocale(locale: string) {
    this.locale.set(locale);
  }

  async switchLocale(locale: string): Promise<void> {
    const resolved = LocaleService.toSupportedLanguage(locale);

    try {
      await this.localeDataLoader.ensureLoaded(resolved);
    } catch (error) {
      console.error(`LocaleService: failed to load locale data for '${resolved}'`, error);
      if (!EAGERLY_REGISTERED_LANGUAGES.includes(resolved)) {
        return;
      }
    }

    this.locale.set(resolved);
  }

  getLocale(): string {
    return this.locale();
  }

  static readBrowserLanguageTag(): string {
    return navigator.language || navigator.languages?.[0] || DomainMessages.DEFAULT_LANG;
  }

  static detectBrowserLanguage(): string {
    return LocaleService.toSupportedLanguage(LocaleService.readBrowserLanguageTag());
  }

  static toSupportedLanguage(languageTag: string): string {
    return LocaleService.matchSupportedLanguage(languageTag) ?? DomainMessages.DEFAULT_LANG;
  }

  static matchSupportedLanguage(languageTag: string): string | null {
    const normalized = (languageTag ?? '').trim().toLowerCase();
    if (!normalized) {
      return null;
    }

    const exact = CANONICAL_BY_LOWERCASE.get(normalized);
    if (exact) {
      return exact;
    }

    const parts = normalized.split('-');
    const base = parts[0];

    for (const subtag of parts.slice(1)) {
      const candidate = CANONICAL_BY_LOWERCASE.get(`${base}-${subtag}`);
      if (candidate) {
        return candidate;
      }

      const scripted = SCRIPT_FALLBACKS[`${base}-${subtag}`];
      if (scripted) {
        return scripted;
      }
    }

    return CANONICAL_BY_LOWERCASE.get(base) ?? BASE_FALLBACKS[base] ?? null;
  }
}
