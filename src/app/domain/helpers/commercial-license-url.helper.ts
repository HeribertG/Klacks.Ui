// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Builds the link to the commercial license page on the Klacks website in the user's UI language, and a
 * signal that follows language changes. Unknown languages fall back to the unprefixed German page.
 * @param language - Current UI language code (e.g. "de", "zh-CN")
 */
import { inject, Signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { TranslateService } from '@ngx-translate/core';
import { map } from 'rxjs';
import {
  COMMERCIAL_LICENSE_PAGE_SLUG,
  COMMERCIAL_LICENSE_SITE_LANGUAGES,
  COMMERCIAL_LICENSE_SITE_URL,
  COMMERCIAL_LICENSE_UNPREFIXED_LANGUAGE,
} from 'src/app/domain/constants/commercial-license.constants';

export function toCommercialLicenseUrl(language: string | undefined): string {
  const slug = (language ?? '').toLowerCase();
  const isPrefixed = slug !== COMMERCIAL_LICENSE_UNPREFIXED_LANGUAGE && COMMERCIAL_LICENSE_SITE_LANGUAGES.includes(slug);

  return isPrefixed
    ? `${COMMERCIAL_LICENSE_SITE_URL}/${slug}/${COMMERCIAL_LICENSE_PAGE_SLUG}`
    : `${COMMERCIAL_LICENSE_SITE_URL}/${COMMERCIAL_LICENSE_PAGE_SLUG}`;
}

export function commercialLicenseUrlSignal(): Signal<string> {
  const translate = inject(TranslateService);

  return toSignal(translate.onLangChange.pipe(map(event => toCommercialLicenseUrl(event.lang))), {
    initialValue: toCommercialLicenseUrl(translate.currentLang),
  });
}
