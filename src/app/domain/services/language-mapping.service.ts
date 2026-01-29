import { Injectable, inject } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { LanguageConfigService } from 'src/app/application/services/language-config.service';

export interface LanguageConfig {
  code: string;
  name: string;
  speechLocale: string;
  displayName: string;
}

@Injectable({
  providedIn: 'root',
})
export class LanguageMappingService {
  private translateService = inject(TranslateService);
  private languageConfigService = inject(LanguageConfigService);

  private readonly defaultConfigs: Record<string, LanguageConfig> = {
    de: {
      code: 'de',
      name: 'German',
      speechLocale: 'de-CH',
      displayName: 'Deutsch',
    },
    en: {
      code: 'en',
      name: 'English',
      speechLocale: 'en-US',
      displayName: 'English',
    },
    fr: {
      code: 'fr',
      name: 'French',
      speechLocale: 'fr-FR',
      displayName: 'Français',
    },
    it: {
      code: 'it',
      name: 'Italian',
      speechLocale: 'it-IT',
      displayName: 'Italiano',
    },
  };

  getSpeechLocale(langCode?: string): string {
    const code =
      langCode ||
      this.translateService.currentLang ||
      this.translateService.defaultLang ||
      'de';
    const fromConfig = this.languageConfigService.getSpeechLocale(code);
    if (fromConfig && fromConfig !== 'de-CH') {
      return fromConfig;
    }
    return this.defaultConfigs[code]?.speechLocale || 'de-CH';
  }

  getLanguageName(langCode?: string): string {
    const code =
      langCode ||
      this.translateService.currentLang ||
      this.translateService.defaultLang ||
      'de';
    const metadata = this.languageConfigService.getLanguageMetadata(code);
    if (metadata) {
      return metadata.name;
    }
    return this.defaultConfigs[code]?.name || 'German';
  }

  getAvailableLanguages(): LanguageConfig[] {
    const supported = this.languageConfigService.getSupportedLanguages();
    const metadata = this.languageConfigService.getMetadata();

    return supported.map((code) => {
      const meta = metadata[code];
      if (meta) {
        return {
          code,
          name: meta.name,
          speechLocale: meta.speechLocale,
          displayName: meta.displayName,
        };
      }
      return (
        this.defaultConfigs[code] || {
          code,
          name: code.toUpperCase(),
          speechLocale: 'de-CH',
          displayName: code.toUpperCase(),
        }
      );
    });
  }

  getLanguageConfig(langCode: string): LanguageConfig | undefined {
    const meta = this.languageConfigService.getLanguageMetadata(langCode);
    if (meta) {
      return {
        code: langCode,
        name: meta.name,
        speechLocale: meta.speechLocale,
        displayName: meta.displayName,
      };
    }
    return this.defaultConfigs[langCode];
  }

  getAllSpeechLocales(): string[] {
    return this.getAvailableLanguages().map((config) => config.speechLocale);
  }

  isLanguageSupported(langCode: string): boolean {
    return this.languageConfigService.isLanguageSupported(langCode);
  }
}
