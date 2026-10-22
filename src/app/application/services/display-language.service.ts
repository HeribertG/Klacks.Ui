// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Reads and switches the display language chosen in the profile: the stored choice counts only while the
 * installation still supports it; switching activates the translations, stores the choice, re-translates the
 * string constants and loads the Angular locale data.
 * @param lang - Language code to activate
 */
import { inject, Injectable } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { StorageKeys } from 'src/app/domain/constants/storage-keys';
import { LocalStorageService } from 'src/app/infrastructure/storage/local-storage.service';
import { TranslateStringConstantsService } from 'src/app/application/translate/translate-string-constants.service';
import { LanguageConfigService } from './language-config.service';
import { LocaleService } from './locale.service';

@Injectable({ providedIn: 'root' })
export class DisplayLanguageService {
  private translateService = inject(TranslateService);
  private translateStringConstantsService = inject(TranslateStringConstantsService);
  private localStorageService = inject(LocalStorageService);
  private localeService = inject(LocaleService);
  private languageConfigService = inject(LanguageConfigService);

  savedSupportedLanguage(): string | null {
    const savedLang = this.localStorageService.get(StorageKeys.CURRENT_LANG);
    return savedLang && this.languageConfigService.isLanguageSupported(savedLang) ? savedLang : null;
  }

  switchTo(lang: string): void {
    this.translateService.use(lang);
    this.localStorageService.set(StorageKeys.CURRENT_LANG, lang);
    this.translateStringConstantsService.translate();
    void this.localeService.switchLocale(lang);
  }
}
