// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Loads Angular locale data on demand for every application language (4 core languages
 * plus the 21 language plugins), so date, number and currency pipes as well as the
 * ngb datepicker never fail with NG0701 "Missing locale data".
 * @param appLanguage - Application language code as used by the UI and the backend
 *                      (for example 'de', 'es' or 'zh-TW'), not the Angular locale id.
 */
import { Injectable } from '@angular/core';
import { registerLocaleData } from '@angular/common';

interface LocaleDataModule {
  default: unknown[];
}

type LocaleDataImport = () => Promise<LocaleDataModule>;

const UNKNOWN_LANGUAGE_WARNING = 'LocaleDataLoaderService: no Angular locale data mapping for';

const LOCALE_DATA_IMPORTS: Readonly<Record<string, LocaleDataImport>> = {
  ar: () => import('@angular/common/locales/ar'),
  cs: () => import('@angular/common/locales/cs'),
  da: () => import('@angular/common/locales/da'),
  de: () => import('@angular/common/locales/de'),
  el: () => import('@angular/common/locales/el'),
  en: () => import('@angular/common/locales/en'),
  es: () => import('@angular/common/locales/es'),
  fi: () => import('@angular/common/locales/fi'),
  fr: () => import('@angular/common/locales/fr'),
  he: () => import('@angular/common/locales/he'),
  id: () => import('@angular/common/locales/id'),
  it: () => import('@angular/common/locales/it'),
  ja: () => import('@angular/common/locales/ja'),
  ko: () => import('@angular/common/locales/ko'),
  ms: () => import('@angular/common/locales/ms'),
  nb: () => import('@angular/common/locales/nb'),
  nl: () => import('@angular/common/locales/nl'),
  pl: () => import('@angular/common/locales/pl'),
  pt: () => import('@angular/common/locales/pt'),
  ro: () => import('@angular/common/locales/ro'),
  sv: () => import('@angular/common/locales/sv'),
  th: () => import('@angular/common/locales/th'),
  vi: () => import('@angular/common/locales/vi'),
  'zh-CN': () => import('@angular/common/locales/zh-Hans'),
  'zh-TW': () => import('@angular/common/locales/zh-Hant'),
};

export const SUPPORTED_APP_LANGUAGES: readonly string[] = Object.freeze(
  Object.keys(LOCALE_DATA_IMPORTS)
);

export const EAGERLY_REGISTERED_LANGUAGES: readonly string[] = Object.freeze([
  'de',
  'fr',
  'en',
  'it',
]);

@Injectable({ providedIn: 'root' })
export class LocaleDataLoaderService {
  private readonly loaded = new Set<string>();
  private readonly pending = new Map<string, Promise<void>>();

  isLoaded(appLanguage: string): boolean {
    return this.loaded.has(appLanguage);
  }

  ensureLoaded(appLanguage: string): Promise<void> {
    if (this.loaded.has(appLanguage)) {
      return Promise.resolve();
    }

    const pending = this.pending.get(appLanguage);
    if (pending) {
      return pending;
    }

    const importLocaleData = LOCALE_DATA_IMPORTS[appLanguage];
    if (!importLocaleData) {
      console.warn(`${UNKNOWN_LANGUAGE_WARNING} '${appLanguage}'`);
      return Promise.resolve();
    }

    const task = importLocaleData()
      .then((module) => {
        registerLocaleData(module.default);
        registerLocaleData(module.default, appLanguage);
        this.loaded.add(appLanguage);
      })
      .finally(() => {
        this.pending.delete(appLanguage);
      });

    this.pending.set(appLanguage, task);
    return task;
  }
}
