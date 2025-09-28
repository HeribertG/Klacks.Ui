import { Injectable, inject } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';

export interface LanguageConfig {
  code: string;
  name: string;
  speechLocale: string;
  displayName: string;
}

@Injectable({
  providedIn: 'root'
})
export class LanguageMappingService {
  private translateService = inject(TranslateService);

  private readonly languageConfigs: Record<string, LanguageConfig> = {
    de: {
      code: 'de',
      name: 'German',
      speechLocale: 'de-CH',
      displayName: 'Deutsch'
    },
    en: {
      code: 'en',
      name: 'English',
      speechLocale: 'en-US',
      displayName: 'English'
    },
    fr: {
      code: 'fr',
      name: 'French',
      speechLocale: 'fr-FR',
      displayName: 'Français'
    },
    it: {
      code: 'it',
      name: 'Italian',
      speechLocale: 'it-IT',
      displayName: 'Italiano'
    }
  };

  getSpeechLocale(langCode?: string): string {
    const code = langCode || this.translateService.currentLang || this.translateService.defaultLang || 'de';
    return this.languageConfigs[code]?.speechLocale || 'de-CH';
  }

  getLanguageName(langCode?: string): string {
    const code = langCode || this.translateService.currentLang || this.translateService.defaultLang || 'de';
    return this.languageConfigs[code]?.name || 'German';
  }

  getAvailableLanguages(): LanguageConfig[] {
    return Object.values(this.languageConfigs);
  }

  getLanguageConfig(langCode: string): LanguageConfig | undefined {
    return this.languageConfigs[langCode];
  }

  getAllSpeechLocales(): string[] {
    return Object.values(this.languageConfigs).map(config => config.speechLocale);
  }

  isLanguageSupported(langCode: string): boolean {
    return langCode in this.languageConfigs;
  }
}