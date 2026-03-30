// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Service that manages the text direction (ltr/rtl) of the document based on the active locale.
 * Reads direction from language metadata if available, otherwise uses a built-in RTL language list.
 * Sets document.documentElement.dir and document.documentElement.lang as side effects.
 */
import { computed, effect, inject, Injectable, Signal } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { LocaleService } from 'src/app/application/services/locale.service';
import { LanguageConfigService } from 'src/app/application/services/language-config.service';

const RTL_LANGUAGES = ['ar', 'yi', 'he', 'fa', 'ur'];

@Injectable({ providedIn: 'root' })
export class DirectionService {
  private localeService = inject(LocaleService);
  private languageConfigService = inject(LanguageConfigService);
  private document = inject(DOCUMENT);

  readonly direction: Signal<'ltr' | 'rtl'> = computed(() => {
    const locale = this.localeService.locale();
    const metadata = this.languageConfigService.metadata$();
    const langMetadata = metadata[locale];

    if (langMetadata?.direction) {
      return langMetadata.direction;
    }

    return RTL_LANGUAGES.includes(locale) ? 'rtl' : 'ltr';
  });

  constructor() {
    effect(() => {
      const dir = this.direction();
      const locale = this.localeService.locale();
      this.document.documentElement.dir = dir;
      this.document.documentElement.lang = locale;
    });
  }
}
