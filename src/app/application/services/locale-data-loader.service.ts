// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Loads Angular locale data on demand for every application language (4 core languages
 * plus the 21 language plugins), so date, number and currency pipes as well as the
 * ngb datepicker never fail with NG0701 "Missing locale data". The extra locale data is
 * loaded as well, because time patterns with flexible day periods (zh-Hant "Bh:mm") make
 * the DatePipe fail with NG02303 "Missing extra locale data" without it.
 * @param appLanguage - Application language code as used by the UI and the backend
 *                      (for example 'de', 'es' or 'zh-TW'), not the Angular locale id.
 */
import { Injectable } from '@angular/core';
import { registerLocaleData } from '@angular/common';

interface LocaleDataModule {
  default: unknown[];
}

type LocaleDataImport = () => Promise<LocaleDataModule>;

interface LocaleDataImports {
  data: LocaleDataImport;
  extra: LocaleDataImport;
}

const UNKNOWN_LANGUAGE_WARNING = 'LocaleDataLoaderService: no Angular locale data mapping for';

const LOCALE_DATA_IMPORTS: Readonly<Record<string, LocaleDataImports>> = {
  ar: {
    data: () => import('@angular/common/locales/ar'),
    extra: () => import('@angular/common/locales/extra/ar'),
  },
  cs: {
    data: () => import('@angular/common/locales/cs'),
    extra: () => import('@angular/common/locales/extra/cs'),
  },
  da: {
    data: () => import('@angular/common/locales/da'),
    extra: () => import('@angular/common/locales/extra/da'),
  },
  de: {
    data: () => import('@angular/common/locales/de'),
    extra: () => import('@angular/common/locales/extra/de'),
  },
  el: {
    data: () => import('@angular/common/locales/el'),
    extra: () => import('@angular/common/locales/extra/el'),
  },
  en: {
    data: () => import('@angular/common/locales/en'),
    extra: () => import('@angular/common/locales/extra/en'),
  },
  es: {
    data: () => import('@angular/common/locales/es'),
    extra: () => import('@angular/common/locales/extra/es'),
  },
  fi: {
    data: () => import('@angular/common/locales/fi'),
    extra: () => import('@angular/common/locales/extra/fi'),
  },
  fr: {
    data: () => import('@angular/common/locales/fr'),
    extra: () => import('@angular/common/locales/extra/fr'),
  },
  he: {
    data: () => import('@angular/common/locales/he'),
    extra: () => import('@angular/common/locales/extra/he'),
  },
  id: {
    data: () => import('@angular/common/locales/id'),
    extra: () => import('@angular/common/locales/extra/id'),
  },
  it: {
    data: () => import('@angular/common/locales/it'),
    extra: () => import('@angular/common/locales/extra/it'),
  },
  ja: {
    data: () => import('@angular/common/locales/ja'),
    extra: () => import('@angular/common/locales/extra/ja'),
  },
  ko: {
    data: () => import('@angular/common/locales/ko'),
    extra: () => import('@angular/common/locales/extra/ko'),
  },
  ms: {
    data: () => import('@angular/common/locales/ms'),
    extra: () => import('@angular/common/locales/extra/ms'),
  },
  nb: {
    data: () => import('@angular/common/locales/nb'),
    extra: () => import('@angular/common/locales/extra/nb'),
  },
  nl: {
    data: () => import('@angular/common/locales/nl'),
    extra: () => import('@angular/common/locales/extra/nl'),
  },
  pl: {
    data: () => import('@angular/common/locales/pl'),
    extra: () => import('@angular/common/locales/extra/pl'),
  },
  pt: {
    data: () => import('@angular/common/locales/pt'),
    extra: () => import('@angular/common/locales/extra/pt'),
  },
  ro: {
    data: () => import('@angular/common/locales/ro'),
    extra: () => import('@angular/common/locales/extra/ro'),
  },
  sv: {
    data: () => import('@angular/common/locales/sv'),
    extra: () => import('@angular/common/locales/extra/sv'),
  },
  th: {
    data: () => import('@angular/common/locales/th'),
    extra: () => import('@angular/common/locales/extra/th'),
  },
  vi: {
    data: () => import('@angular/common/locales/vi'),
    extra: () => import('@angular/common/locales/extra/vi'),
  },
  'zh-CN': {
    data: () => import('@angular/common/locales/zh-Hans'),
    extra: () => import('@angular/common/locales/extra/zh-Hans'),
  },
  'zh-TW': {
    data: () => import('@angular/common/locales/zh-Hant'),
    extra: () => import('@angular/common/locales/extra/zh-Hant'),
  },
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

    const imports = LOCALE_DATA_IMPORTS[appLanguage];
    if (!imports) {
      console.warn(`${UNKNOWN_LANGUAGE_WARNING} '${appLanguage}'`);
      return Promise.resolve();
    }

    const task = Promise.all([imports.data(), imports.extra()])
      .then(([data, extra]) => {
        registerLocaleData(data.default, extra.default);
        registerLocaleData(data.default, appLanguage, extra.default);
        this.loaded.add(appLanguage);
      })
      .finally(() => {
        this.pending.delete(appLanguage);
      });

    this.pending.set(appLanguage, task);
    return task;
  }
}
